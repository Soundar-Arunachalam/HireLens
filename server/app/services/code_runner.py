from __future__ import annotations

import base64
from dataclasses import dataclass
from subprocess import PIPE, TimeoutExpired, run as _run
from time import perf_counter
from uuid import uuid4

STDOUT_LIMIT = 65_536  # 64 KB — cap output to avoid huge API responses
_CE_PREFIX = "__CE__\n"  # marker prepended to stdout when compilation fails


@dataclass(slots=True)
class RunResult:
    stdout: str
    stderr: str
    exit_code: int | None
    timed_out: bool
    compilation_failed: bool
    compile_stderr: str
    duration_ms: float


def _kill_container(name: str) -> None:
    """Best-effort kill of a named Docker container after timeout."""
    try:
        _run(["docker", "kill", name], timeout=5, check=False, capture_output=True)
    except Exception:
        pass


def _docker_cmd(container_name: str, image: str, inner_cmd: list[str]) -> list[str]:
    """Build the full docker run command with security hardening flags."""
    return [
        "docker", "run", "--rm", "-i",
        "--name", container_name,
        "--network", "none",
        "--cpus", "0.5",
        "--memory", "256m",
        "--pids-limit", "64",
        "--read-only",
        "--tmpfs", "/tmp:size=64m,exec",
        "--security-opt", "no-new-privileges",
        image,
        *inner_cmd,
    ]


def _compiled_bash(code: str, source: str, compile_cmd: str, run_cmd: str) -> str:
    """
    Return a bash -c script that:
    1. Decodes base64-encoded code into `source`.
    2. Compiles it — on failure prints _CE_PREFIX + compiler output, exits 1.
    3. On success, runs the binary (which reads stdin from the container's stdin,
       i.e. our test-case input piped via subprocess).
    """
    encoded = base64.b64encode(code.encode()).decode()
    return (
        f"printf '%s' '{encoded}' | base64 -d > {source}; "
        f"CERR=$({compile_cmd} 2>&1); "
        f"if [ $? -ne 0 ]; then "
        f"  printf '{_CE_PREFIX}%s' \"$CERR\"; "
        f"  exit 1; "
        f"fi; "
        f"{run_cmd}"
    )


def _resolve_lang(language: str, code: str, timeout_sec: float) -> tuple[str, list[str]]:
    """Return (docker_image, inner_cmd) for the given language."""
    match language:
        case "python":
            return "python:3.13-slim", ["timeout", str(timeout_sec), "python", "-c", code]
        case "javascript":
            return "node:20-slim", ["timeout", str(timeout_sec), "node", "-e", code]
        case "cpp":
            script = _compiled_bash(
                code,
                source="/tmp/sol.cpp",
                compile_cmd="g++ -O2 -std=c++17 -o /tmp/sol /tmp/sol.cpp",
                run_cmd=f"timeout {timeout_sec} /tmp/sol",
            )
            return "gcc:14", ["bash", "-c", script]
        case "java":
            script = _compiled_bash(
                code,
                source="/tmp/Main.java",
                compile_cmd="javac /tmp/Main.java",
                run_cmd=f"timeout {timeout_sec} java -cp /tmp Main",
            )
            return "eclipse-temurin:21-jre-alpine", ["bash", "-c", script]
        case _:
            raise ValueError(f"Unsupported language: {language!r}")


def run_code(
    code: str,
    stdin_data: str,
    language: str = "python",
    timeout_ms: int = 5000,
) -> RunResult:
    """
    Execute `code` in a Docker sandbox and return the result.

    Supported languages: python, javascript, cpp, java.
    The container is named so it can be killed if it exceeds timeout.
    """
    container_name = f"ce-run-{uuid4().hex[:12]}"
    timeout_sec = timeout_ms / 1000.0
    image, inner_cmd = _resolve_lang(language, code, timeout_sec)
    command = _docker_cmd(container_name, image, inner_cmd)

    start = perf_counter()
    try:
        completed = _run(
            command,
            input=stdin_data,
            text=True,
            stdout=PIPE,
            stderr=PIPE,
            timeout=timeout_sec + 10.0,  # 10s extra allowance for compilation and container startup
            check=False,
        )
        duration_ms = (perf_counter() - start) * 1000
        raw_stdout = completed.stdout[:STDOUT_LIMIT]
        raw_stderr = completed.stderr[:STDOUT_LIMIT]

        # Detect compilation error via sentinel prefix
        if raw_stdout.startswith(_CE_PREFIX):
            return RunResult(
                stdout="",
                stderr="",
                exit_code=completed.returncode,
                timed_out=False,
                compilation_failed=True,
                compile_stderr=raw_stdout[len(_CE_PREFIX):],
                duration_ms=duration_ms,
            )

        # Detect inner timeout (exit code 124 from `timeout` command)
        timed_out = completed.returncode == 124

        return RunResult(
            stdout=raw_stdout,
            stderr=raw_stderr,
            exit_code=completed.returncode if not timed_out else None,
            timed_out=timed_out,
            compilation_failed=False,
            compile_stderr="",
            duration_ms=duration_ms,
        )

    except TimeoutExpired as exc:
        duration_ms = (perf_counter() - start) * 1000
        _kill_container(container_name)  # ← critical: stop the leaked container
        stdout = exc.stdout if isinstance(exc.stdout, str) else (exc.stdout or b"").decode(errors="replace")
        stderr = exc.stderr if isinstance(exc.stderr, str) else (exc.stderr or b"").decode(errors="replace")
        return RunResult(
            stdout=stdout[:STDOUT_LIMIT],
            stderr=stderr[:STDOUT_LIMIT],
            exit_code=None,
            timed_out=True,
            compilation_failed=False,
            compile_stderr="",
            duration_ms=duration_ms,
        )

