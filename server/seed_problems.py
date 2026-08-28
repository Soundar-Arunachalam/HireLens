import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models import ProblemORM

DB_URL = os.environ.get("DATABASE_URL", "postgresql+psycopg://postgres:postgres@db:5432/codeeditor")
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

problems_data = [
    # --- Coding Problems ---
    {
        "title": "Two Sum",
        "slug": "two-sum",
        "description": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have **exactly one solution**, and you may not use the same element twice.\n\nYou can return the answer in any order.",
        "problem_type": "coding",
        "difficulty": "easy",
        "tags": ["array", "hash-table"],
        "examples": [{"in": "[2,7,11,15]\n9", "out": "[0,1]"}],
        "hidden_cases": [{"in": "[2,7,11,15]\n9", "out": "[0,1]"}, {"in": "[3,2,4]\n6", "out": "[1,2]"}, {"in": "[3,3]\n6", "out": "[0,1]"}],
        "constraints": ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9", "Only one valid answer exists."]
    },
    {
        "title": "Valid Parentheses",
        "slug": "valid-parentheses",
        "description": "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
        "problem_type": "coding",
        "difficulty": "easy",
        "tags": ["string", "stack"],
        "examples": [{"in": "\"()\"", "out": "true"}, {"in": "\"()[]{}\"", "out": "true"}, {"in": "\"(]\"", "out": "false"}],
        "hidden_cases": [{"in": "\"()\"", "out": "true"}, {"in": "\"()[]{}\"", "out": "true"}, {"in": "\"(]\"", "out": "false"}, {"in": "\"([)]\"", "out": "false"}, {"in": "\"{[]}\"", "out": "true"}],
        "constraints": ["1 <= s.length <= 10^4", "s consists of parentheses only '()[]{}'."]
    },
    {
        "title": "Merge Two Sorted Lists",
        "slug": "merge-two-sorted-lists",
        "description": "You are given the heads of two sorted linked lists `list1` and `list2`.\n\nMerge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.\n\nReturn the head of the merged linked list.",
        "problem_type": "coding",
        "difficulty": "easy",
        "tags": ["linked-list", "recursion"],
        "examples": [{"in": "list1 = [1,2,4]\nlist2 = [1,3,4]", "out": "[1,1,2,3,4,4]"}],
        "hidden_cases": [{"in": "[1,2,4]\n[1,3,4]", "out": "[1,1,2,3,4,4]"}, {"in": "[]\n[]", "out": "[]"}, {"in": "[]\n[0]", "out": "[0]"}],
        "constraints": ["The number of nodes in both lists is in the range [0, 50].", "-100 <= Node.val <= 100", "Both list1 and list2 are sorted in non-decreasing order."]
    },
    {
        "title": "Maximum Subarray",
        "slug": "maximum-subarray",
        "description": "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.",
        "problem_type": "coding",
        "difficulty": "medium",
        "tags": ["array", "dynamic-programming", "divide-and-conquer"],
        "examples": [{"in": "[-2,1,-3,4,-1,2,1,-5,4]", "out": "6"}],
        "hidden_cases": [{"in": "[-2,1,-3,4,-1,2,1,-5,4]", "out": "6"}, {"in": "[1]", "out": "1"}, {"in": "[5,4,-1,7,8]", "out": "23"}],
        "constraints": ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"]
    },
    {
        "title": "Climbing Stairs",
        "slug": "climbing-stairs",
        "description": "You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
        "problem_type": "coding",
        "difficulty": "easy",
        "tags": ["math", "dynamic-programming", "memoization"],
        "examples": [{"in": "2", "out": "2"}, {"in": "3", "out": "3"}],
        "hidden_cases": [{"in": "2", "out": "2"}, {"in": "3", "out": "3"}, {"in": "4", "out": "5"}],
        "constraints": ["1 <= n <= 45"]
    },
    {
        "title": "Reverse Linked List",
        "slug": "reverse-linked-list",
        "description": "Given the `head` of a singly linked list, reverse the list, and return the reversed list.",
        "problem_type": "coding",
        "difficulty": "easy",
        "tags": ["linked-list", "recursion"],
        "examples": [{"in": "[1,2,3,4,5]", "out": "[5,4,3,2,1]"}],
        "hidden_cases": [{"in": "[1,2,3,4,5]", "out": "[5,4,3,2,1]"}, {"in": "[1,2]", "out": "[2,1]"}, {"in": "[]", "out": "[]"}],
        "constraints": ["The number of nodes in the list is the range [0, 5000].", "-5000 <= Node.val <= 5000"]
    },
    {
        "title": "3Sum",
        "slug": "3sum",
        "description": "Given an integer array nums, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.\n\nNotice that the solution set must not contain duplicate triplets.",
        "problem_type": "coding",
        "difficulty": "medium",
        "tags": ["array", "two-pointers", "sorting"],
        "examples": [{"in": "[-1,0,1,2,-1,-4]", "out": "[[-1,-1,2],[-1,0,1]]"}],
        "hidden_cases": [{"in": "[-1,0,1,2,-1,-4]", "out": "[[-1,-1,2],[-1,0,1]]"}, {"in": "[0,1,1]", "out": "[]"}, {"in": "[0,0,0]", "out": "[[0,0,0]]"}],
        "constraints": ["3 <= nums.length <= 3000", "-10^5 <= nums[i] <= 10^5"]
    },
    {
        "title": "Binary Tree Level Order Traversal",
        "slug": "binary-tree-level-order-traversal",
        "description": "Given the `root` of a binary tree, return the level order traversal of its nodes' values. (i.e., from left to right, level by level).",
        "problem_type": "coding",
        "difficulty": "medium",
        "tags": ["tree", "breadth-first-search", "binary-tree"],
        "examples": [{"in": "[3,9,20,null,null,15,7]", "out": "[[3],[9,20],[15,7]]"}],
        "hidden_cases": [{"in": "[3,9,20,null,null,15,7]", "out": "[[3],[9,20],[15,7]]"}, {"in": "[1]", "out": "[[1]]"}, {"in": "[]", "out": "[]"}],
        "constraints": ["The number of nodes in the tree is in the range [0, 2000].", "-1000 <= Node.val <= 1000"]
    },
    {
        "title": "Longest Substring Without Repeating Characters",
        "slug": "longest-substring-without-repeating-characters",
        "description": "Given a string `s`, find the length of the longest substring without repeating characters.",
        "problem_type": "coding",
        "difficulty": "medium",
        "tags": ["hash-table", "string", "sliding-window"],
        "examples": [{"in": "\"abcabcbb\"", "out": "3"}],
        "hidden_cases": [{"in": "\"abcabcbb\"", "out": "3"}, {"in": "\"bbbbb\"", "out": "1"}, {"in": "\"pwwkew\"", "out": "3"}],
        "constraints": ["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces."]
    },
    {
        "title": "LRU Cache",
        "slug": "lru-cache",
        "description": "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.\n\nImplement the `LRUCache` class:\n* `LRUCache(int capacity)` Initialize the LRU cache with positive size capacity.\n* `int get(int key)` Return the value of the key if the key exists, otherwise return -1.\n* `void put(int key, int value)` Update the value of the key if the key exists. Otherwise, add the key-value pair to the cache. If the number of keys exceeds the capacity from this operation, evict the least recently used key.",
        "problem_type": "coding",
        "difficulty": "medium",
        "tags": ["hash-table", "linked-list", "design", "doubly-linked-list"],
        "examples": [{"in": "[\"LRUCache\", \"put\", \"put\", \"get\", \"put\", \"get\", \"put\", \"get\", \"get\", \"get\"]\n[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]", "out": "[null, null, null, 1, null, -1, null, -1, 3, 4]"}],
        "hidden_cases": [{"in": "[\"LRUCache\", \"put\", \"put\", \"get\", \"put\", \"get\", \"put\", \"get\", \"get\", \"get\"]\n[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]", "out": "[null, null, null, 1, null, -1, null, -1, 3, 4]"}],
        "constraints": ["1 <= capacity <= 3000", "0 <= key <= 10^4", "0 <= value <= 10^5", "At most 2 * 10^5 calls will be made to get and put."]
    },
    {
        "title": "Number of Islands",
        "slug": "number-of-islands",
        "description": "Given an `m x n` 2D binary grid `grid` which represents a map of `'1'`s (land) and `'0'`s (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.",
        "problem_type": "coding",
        "difficulty": "medium",
        "tags": ["array", "depth-first-search", "breadth-first-search", "union-find", "matrix"],
        "examples": [{"in": "[\n  [\"1\",\"1\",\"1\",\"1\",\"0\"],\n  [\"1\",\"1\",\"0\",\"1\",\"0\"],\n  [\"1\",\"1\",\"0\",\"0\",\"0\"],\n  [\"0\",\"0\",\"0\",\"0\",\"0\"]\n]", "out": "1"}],
        "hidden_cases": [{"in": "[[\"1\",\"1\",\"1\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"0\",\"0\",\"0\",\"0\",\"0\"]]", "out": "1"}, {"in": "[[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"0\",\"0\",\"1\",\"0\",\"0\"],[\"0\",\"0\",\"0\",\"1\",\"1\"]]", "out": "3"}],
        "constraints": ["m == grid.length", "n == grid[i].length", "1 <= m, n <= 300", "grid[i][j] is '0' or '1'."]
    },
    {
        "title": "Course Schedule",
        "slug": "course-schedule",
        "description": "There are a total of `numCourses` courses you have to take, labeled from `0` to `numCourses - 1`. You are given an array `prerequisites` where `prerequisites[i] = [ai, bi]` indicates that you must take course `bi` first if you want to take course `ai`.\n\nReturn `true` if you can finish all courses. Otherwise, return `false`.",
        "problem_type": "coding",
        "difficulty": "medium",
        "tags": ["depth-first-search", "breadth-first-search", "graph", "topological-sort"],
        "examples": [{"in": "numCourses = 2\nprerequisites = [[1,0]]", "out": "true"}],
        "hidden_cases": [{"in": "2\n[[1,0]]", "out": "true"}, {"in": "2\n[[1,0],[0,1]]", "out": "false"}],
        "constraints": ["1 <= numCourses <= 2000", "0 <= prerequisites.length <= 5000"]
    },
    {
        "title": "Merge Intervals",
        "slug": "merge-intervals",
        "description": "Given an array of `intervals` where `intervals[i] = [starti, endi]`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.",
        "problem_type": "coding",
        "difficulty": "medium",
        "tags": ["array", "sorting"],
        "examples": [{"in": "[[1,3],[2,6],[8,10],[15,18]]", "out": "[[1,6],[8,10],[15,18]]"}],
        "hidden_cases": [{"in": "[[1,3],[2,6],[8,10],[15,18]]", "out": "[[1,6],[8,10],[15,18]]"}, {"in": "[[1,4],[4,5]]", "out": "[[1,5]]"}],
        "constraints": ["1 <= intervals.length <= 10^4", "intervals[i].length == 2", "0 <= starti <= endi <= 10^4"]
    },
    {
        "title": "Word Search",
        "slug": "word-search",
        "description": "Given an `m x n` grid of characters `board` and a string `word`, return `true` if `word` exists in the grid.\n\nThe word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once.",
        "problem_type": "coding",
        "difficulty": "medium",
        "tags": ["array", "backtracking", "matrix"],
        "examples": [{"in": "board = [[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]]\nword = \"ABCCED\"", "out": "true"}],
        "hidden_cases": [{"in": "[[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]]\n\"ABCCED\"", "out": "true"}, {"in": "[[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]]\n\"SEE\"", "out": "true"}],
        "constraints": ["m == board.length", "n = board[i].length", "1 <= m, n <= 6", "1 <= word.length <= 15"]
    },
    {
        "title": "Find Minimum in Rotated Sorted Array",
        "slug": "find-minimum-in-rotated-sorted-array",
        "description": "Suppose an array of length `n` sorted in ascending order is rotated between `1` and `n` times. Given the sorted rotated array `nums` of unique elements, return the minimum element of this array.\n\nYou must write an algorithm that runs in `O(log n)` time.",
        "problem_type": "coding",
        "difficulty": "medium",
        "tags": ["array", "binary-search"],
        "examples": [{"in": "[3,4,5,1,2]", "out": "1"}],
        "hidden_cases": [{"in": "[3,4,5,1,2]", "out": "1"}, {"in": "[4,5,6,7,0,1,2]", "out": "0"}, {"in": "[11,13,15,17]", "out": "11"}],
        "constraints": ["n == nums.length", "1 <= n <= 5000", "-5000 <= nums[i] <= 5000", "All the integers of nums are unique.", "nums is sorted and rotated between 1 and n times."]
    },

    # --- System Design Problems ---
    {
        "title": "Design a Rate Limiter",
        "slug": "design-rate-limiter",
        "description": "Design a highly available and scalable rate limiter that caps the number of requests a user can make to an API within a specified time window.\n\n### Key Requirements:\n1. Limit requests to X requests per Y seconds per user/IP.\n2. Must operate efficiently with minimal latency added to the API path.\n3. The system should scale to millions of active users.\n4. Ensure accuracy in a distributed environment without locking bottlenecks.\n\n### Deliverables (in your Whiteboard):\n- **High Level Architecture:** Draw the components (API Gateway, Rate Limiter Service, Data Store).\n- **Algorithm Choice:** Explicitly note whether you use Token Bucket, Leaking Bucket, Fixed Window, or Sliding Window Log/Counter, and why.\n- **Data Schema/Storage:** Show what is stored in Redis/Memcached and how memory usage is minimized.",
        "problem_type": "design",
        "difficulty": "medium",
        "tags": ["system-design", "caching", "distributed-systems", "api"],
        "examples": [],
        "hidden_cases": [],
        "constraints": ["Latency overhead < 5ms", "Supports up to 10M active users per day"]
    },
    {
        "title": "Design a Distributed Message Queue",
        "slug": "design-distributed-message-queue",
        "description": "Design a distributed, highly available message queue system similar to Kafka or RabbitMQ.\n\n### Key Requirements:\n1. Support for topics, producers, and consumer groups.\n2. High throughput and low latency.\n3. Fault tolerance and persistence (messages must not be lost if a broker goes down).\n4. Ordering guarantees (e.g., within a partition).\n\n### Deliverables (in your Whiteboard):\n- **Component Diagram:** Show Producers, Brokers, Consumers, and Zookeeper/Coordination service.\n- **Storage Mechanism:** How are messages persisted on disk? Describe the append-only log structure.\n- **Replication/Leader Election:** How do you handle broker failures?",
        "problem_type": "design",
        "difficulty": "hard",
        "tags": ["system-design", "streaming", "messaging", "distributed-systems"],
        "examples": [],
        "hidden_cases": [],
        "constraints": ["Throughput: 1M messages per second", "Durability: Disk persistence required"]
    },
    {
        "title": "Design a Video Streaming Service (e.g. YouTube)",
        "slug": "design-video-streaming-service",
        "description": "Design a video streaming platform that allows users to upload, process, and stream videos efficiently at a global scale.\n\n### Key Requirements:\n1. Fast and reliable video upload.\n2. Video processing into different resolutions and formats.\n3. Smooth streaming with minimal buffering for viewers globally.\n4. Scalable metadata storage (titles, views, likes).\n\n### Deliverables (in your Whiteboard):\n- **Upload Flow:** Client -> Object Storage -> Transcoding Queue -> Workers.\n- **Streaming Flow:** Client <- CDN <- Object Storage.\n- **Database Choice:** How to store video metadata and user data.",
        "problem_type": "design",
        "difficulty": "hard",
        "tags": ["system-design", "cdn", "video-processing", "storage"],
        "examples": [],
        "hidden_cases": [],
        "constraints": ["Uploads: 500 hours of video per minute", "DAU: 50 Million"]
    },
    {
        "title": "Design a Chat Application (e.g. WhatsApp)",
        "slug": "design-chat-application",
        "description": "Design a scalable 1-on-1 and group chat application.\n\n### Key Requirements:\n1. Real-time message delivery with low latency.\n2. Message persistence and offline delivery (if user is disconnected).\n3. Read receipts and typing indicators.\n4. Support for large group chats.\n\n### Deliverables (in your Whiteboard):\n- **Connection Management:** How do users maintain a persistent connection (WebSockets/Long Polling)?\n- **Message Routing:** How does a message travel from Sender -> Chat Server -> Receiver?\n- **Database Schema:** Designing tables for Messages, Chats, and Users.",
        "problem_type": "design",
        "difficulty": "hard",
        "tags": ["system-design", "websockets", "real-time", "databases"],
        "examples": [],
        "hidden_cases": [],
        "constraints": ["DAU: 500M", "Latency: < 100ms for message delivery"]
    },
    {
        "title": "Design a Web Crawler",
        "slug": "design-web-crawler",
        "description": "Design a distributed web crawler system that fetches and indexes web pages for a search engine.\n\n### Key Requirements:\n1. Scalability to crawl billions of web pages.\n2. Politeness policy to avoid overwhelming servers.\n3. Handling duplicate URLs and infinite loops (spider traps).\n4. Extensibility for parsing content.\n\n### Deliverables (in your Whiteboard):\n- **Architecture:** URL Frontier, Fetchers, DNS Resolver, Content Parsers, Deduplication Store.\n- **URL Frontier:** How is it implemented to support priority and politeness?\n- **Storage:** Where are the fetched documents and extracted URLs stored?",
        "problem_type": "design",
        "difficulty": "medium",
        "tags": ["system-design", "distributed-systems", "search", "crawling"],
        "examples": [],
        "hidden_cases": [],
        "constraints": ["Crawl 1 billion pages per month", "Strict politeness delays"]
    },
    {
        "title": "Design a Key-Value Store",
        "slug": "design-key-value-store",
        "description": "Design a distributed Key-Value store similar to DynamoDB or Cassandra.\n\n### Key Requirements:\n1. High availability and partition tolerance.\n2. Scalable data partitioning.\n3. Handling data replication and consistency.\n4. Conflict resolution.\n\n### Deliverables (in your Whiteboard):\n- **Partitioning:** Consistent Hashing mechanism.\n- **Replication:** Quorum consensus (W + R > N).\n- **Conflict Resolution:** Vector clocks or Last-Write-Wins.\n- **Storage Engine:** LSM-tree or B-Tree representation.",
        "problem_type": "design",
        "difficulty": "hard",
        "tags": ["system-design", "databases", "nosql", "distributed-systems"],
        "examples": [],
        "hidden_cases": [],
        "constraints": ["Highly Available (AP system in CAP theorem)", "Scalable to Petabytes of data"]
    },
    {
        "title": "Design a Ride-Hailing Service (e.g. Uber)",
        "slug": "design-ride-hailing",
        "description": "Design a ride-hailing service that connects passengers with drivers in real-time.\n\n### Key Requirements:\n1. Real-time location tracking for drivers.\n2. Efficient driver-passenger matching algorithm.\n3. Trip state management (requested, accepted, ongoing, completed).\n4. Scalability during peak hours (surge).\n\n### Deliverables (in your Whiteboard):\n- **Location Tracking:** How often do drivers send location updates? Which database is used to query nearby drivers?\n- **Matching System:** Architecture of the dispatch/matching service.\n- **Data Schema:** Riders, Drivers, Trips.",
        "problem_type": "design",
        "difficulty": "hard",
        "tags": ["system-design", "geospatial", "real-time", "microservices"],
        "examples": [],
        "hidden_cases": [],
        "constraints": ["10M DAU", "Sub-second location updates for drivers"]
    },
    {
        "title": "Design an Autocomplete System",
        "slug": "design-autocomplete",
        "description": "Design a scalable autocomplete (typeahead) system for a search engine that suggests popular queries as the user types.\n\n### Key Requirements:\n1. Extremely low latency (suggestions must appear instantly).\n2. Rank suggestions by popularity/frequency.\n3. Update suggestions periodically based on new trending searches.\n\n### Deliverables (in your Whiteboard):\n- **Data Structure:** Trie or Prefix Hash Tree implementation.\n- **Data Gathering Service:** How search queries are aggregated and counted over time.\n- **Scaling:** How to partition the Trie when it grows too large to fit in memory.",
        "problem_type": "design",
        "difficulty": "medium",
        "tags": ["system-design", "trie", "search", "caching"],
        "examples": [],
        "hidden_cases": [],
        "constraints": ["Latency < 50ms", "Index size: Billions of search queries"]
    },
    {
        "title": "Design a Notification System",
        "slug": "design-notification-system",
        "description": "Design a scalable notification system capable of sending millions of Push, SMS, and Email notifications.\n\n### Key Requirements:\n1. Support multiple channels (iOS push, Android push, SMS, Email).\n2. Rate limiting and user preference management (opt-outs).\n3. Retry mechanism and reliable delivery.\n4. Analytics (tracking opens and clicks).\n\n### Deliverables (in your Whiteboard):\n- **Architecture Diagram:** Notification Gateway, Worker Queues, 3rd Party Integrations (APNS, FCM, Twilio, SendGrid).\n- **Queueing:** How tasks are separated (e.g., by priority or channel).\n- **Failure Handling:** How to handle third-party service outages or rate limits.",
        "problem_type": "design",
        "difficulty": "medium",
        "tags": ["system-design", "messaging", "queues", "microservices"],
        "examples": [],
        "hidden_cases": [],
        "constraints": ["Send 10 million notifications per day", "Prevent duplicate notifications"]
    },
    {
        "title": "Design a Pastebin",
        "slug": "design-pastebin",
        "description": "Design a Pastebin-like web service where users can store plain text.\n\n### Key Requirements:\n1. Users upload text and get a short, unique URL.\n2. The system should support data expiration (e.g., delete after 1 week).\n3. Read-heavy workload (100 reads per 1 write).\n4. Scalable storage for billions of text snippets.\n\n### Deliverables (in your Whiteboard):\n- **Short URL Generation:** Base62 encoding and collision handling.\n- **Data Storage:** Which database to use for text blobs (Object Storage or NoSQL)?\n- **Caching:** Using Memcached/Redis to handle the read-heavy traffic.",
        "problem_type": "design",
        "difficulty": "easy",
        "tags": ["system-design", "caching", "databases", "hashing"],
        "examples": [],
        "hidden_cases": [],
        "constraints": ["10M writes/day", "1B reads/day", "Max text size: 10MB"]
    }
]

with SessionLocal() as session:
    added = 0
    for data in problems_data:
        # Check if already exists
        existing = session.query(ProblemORM).filter_by(slug=data["slug"]).first()
        if not existing:
            p = ProblemORM(
                title=data["title"],
                slug=data["slug"],
                description=data["description"],
                problem_type=data["problem_type"],
                difficulty=data["difficulty"],
                tags=data["tags"],
                examples=data["examples"],
                hidden_cases=data["hidden_cases"],
                constraints=data["constraints"]
            )
            session.add(p)
            added += 1
    session.commit()
    print(f"Successfully seeded {added} problems.")
