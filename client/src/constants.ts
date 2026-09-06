import { Language, Status } from './types';

export const STATUS_META: Record<Status, { icon: string; label: string }> = {
  accepted:            { icon: '✓',  label: 'Accepted' },
  wrong_answer:        { icon: '✗',  label: 'Wrong Answer' },
  time_limit_exceeded: { icon: '⏱', label: 'Time Limit Exceeded' },
  runtime_error:       { icon: '💥', label: 'Runtime Error' },
  compilation_error:   { icon: '⚠', label: 'Compilation Error' },
  submitted:           { icon: '📐', label: 'Submitted' },
};

export const LANGS: Record<Language, { label: string; monaco: string; starter: string }> = {
  python: {
    label: '🐍 Python 3',
    monaco: 'python',
    starter: `import sys\n\ndef solve():\n    data = sys.stdin.read().split()\n    # write your solution here\n    pass\n\nprint(solve())\n`,
  },
  javascript: {
    label: '⚡ JavaScript',
    monaco: 'javascript',
    starter: `const lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');\n\nfunction solve() {\n  // write your solution here\n}\n\nconsole.log(solve());\n`,
  },
  cpp: {
    label: '⚙️ C++ (GCC)',
    monaco: 'cpp',
    starter: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    // write your solution here\n    return 0;\n}\n`,
  },
  java: {
    label: '☕ Java',
    monaco: 'java',
    starter: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // write your solution here\n    }\n}\n`,
  },
};

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
