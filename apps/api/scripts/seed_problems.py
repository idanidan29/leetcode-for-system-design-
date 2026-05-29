"""Seed the problems table.

Idempotent: re-running updates existing rows by primary key.
Run: .venv/Scripts/python.exe scripts/seed_problems.py
"""

import asyncio
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Difficulty, Problem, ProblemKind
from app.db.session import AsyncSessionMaker, engine

PROBLEMS: list[dict[str, Any]] = [
    {
        "id": "url-shortener",
        "title": "Design a URL shortener",
        "difficulty": Difficulty.easy,
        "statement": (
            "Design a service that converts long URLs into short, shareable aliases "
            "(e.g. bit.ly, tinyurl). Reads vastly outnumber writes — most traffic is "
            "users following an existing short link."
        ),
        "functional_requirements": [
            "Given a long URL, return a short alias (6–8 characters).",
            "Given a short alias, redirect (HTTP 301/302) to the original URL.",
            "Aliases are stable forever once issued — no reassignment.",
            "Custom aliases supported (user supplies the slug).",
            "Per-link click analytics: total count, last-7-day count.",
        ],
        "non_functional_requirements": [
            "Read latency p99 under 50ms.",
            "Available 99.9% of the time.",
            "Eventual consistency on analytics is fine.",
            "Aliases must be hard to guess (no incrementing IDs in URLs).",
        ],
        "constraints": {
            "writes_per_day": 1_000_000,
            "reads_per_day": 100_000_000,
            "alias_length": "6-8 chars, base62",
            "retention": "5 years",
        },
        "tags": ["hashing", "cache", "redirects"],
    },
    {
        "id": "twitter-feed",
        "title": "Design a Twitter-style feed",
        "difficulty": Difficulty.hard,
        "statement": (
            "Design the home timeline for a Twitter-like product. Users follow other "
            "users; when a user opens the app, they see a chronological or ranked "
            "feed of recent posts from people they follow. The hard part is the "
            "fan-out cost when celebrities post."
        ),
        "functional_requirements": [
            "Post a tweet (text, optional media).",
            "Follow / unfollow a user.",
            "Fetch the home timeline for the current user, paginated.",
            "Fetch a user's own profile timeline.",
            "Show new-tweet count since last refresh.",
        ],
        "non_functional_requirements": [
            "Timeline fetch p99 under 200ms.",
            "Tweets visible to followers within 5 seconds.",
            "Read-heavy: ~100:1 read:write ratio.",
            "Handle 'celebrity' accounts with millions of followers.",
        ],
        "constraints": {
            "active_users": 200_000_000,
            "tweets_per_day": 500_000_000,
            "avg_followers": 200,
            "max_followers": 100_000_000,
        },
        "tags": ["fan-out", "timeline", "ranking"],
    },
    {
        "id": "chat",
        "title": "Design a real-time chat service",
        "difficulty": Difficulty.medium,
        "statement": (
            "Design a 1:1 and group messaging service (WhatsApp / Slack DMs). "
            "Messages must be delivered in order, with read receipts, presence, "
            "and offline delivery."
        ),
        "functional_requirements": [
            "Send a message to another user or to a group.",
            "Receive messages in real time when online.",
            "Receive missed messages when coming back online.",
            "Read receipts and typing indicators.",
            "Online / last-seen presence.",
            "Group chats up to 256 members.",
        ],
        "non_functional_requirements": [
            "Message delivery p99 under 1s end-to-end when both online.",
            "At-least-once delivery; client dedupes by message id.",
            "Strict per-conversation ordering.",
            "Messages durable for 1 year.",
        ],
        "constraints": {
            "daily_active_users": 1_000_000_000,
            "messages_per_day": 100_000_000_000,
            "max_group_size": 256,
        },
        "tags": ["websockets", "queues", "presence"],
    },
    {
        "id": "rate-limiter",
        "title": "Design a rate limiter",
        "difficulty": Difficulty.easy,
        "statement": (
            "Design a rate-limiting service that sits in front of an API and enforces "
            "per-user and per-IP request quotas. Must work across a horizontally scaled "
            "fleet of API servers without becoming a bottleneck."
        ),
        "functional_requirements": [
            "Enforce N requests per window (sliding or fixed) per user.",
            "Enforce M requests per window per IP.",
            "Support multiple rules layered (e.g. burst + sustained).",
            "Return clear 429 responses with Retry-After header.",
            "Configurable per route.",
        ],
        "non_functional_requirements": [
            "Adds under 5ms to request latency.",
            "Fails open if the rate limiter itself is unavailable.",
            "Consistent decisions across all API instances.",
        ],
        "constraints": {
            "api_qps": 100_000,
            "rules_per_route": "up to 5",
        },
        "tags": ["token-bucket", "redis", "edge"],
    },
    {
        "id": "autocomplete",
        "title": "Search autocomplete",
        "difficulty": Difficulty.medium,
        "statement": (
            "Design the autocomplete suggestions that appear as a user types in a "
            "search box. Suggestions should be ranked by popularity and personalized "
            "where possible."
        ),
        "functional_requirements": [
            "Return top-10 suggestions for any prefix.",
            "Rank by query frequency over the last 30 days.",
            "Update ranking from query logs daily.",
            "Personalize for logged-in users (boost their recent queries).",
            "Filter profanity and unsafe completions.",
        ],
        "non_functional_requirements": [
            "Suggestion latency p99 under 100ms.",
            "Fresh enough that yesterday's hot query shows up today.",
            "Stale results acceptable during ranking pipeline failures.",
        ],
        "constraints": {
            "queries_per_day": 5_000_000_000,
            "unique_terms": 100_000_000,
            "max_prefix_length": 50,
        },
        "tags": ["trie", "ranking", "cache"],
    },
    {
        "id": "video-streaming",
        "title": "Design a video streaming platform",
        "difficulty": Difficulty.hard,
        "statement": (
            "Design a Netflix / YouTube-style platform: users upload video, the "
            "platform transcodes it into multiple bitrates, and viewers stream it "
            "globally with adaptive bitrate."
        ),
        "functional_requirements": [
            "Upload a video file (up to 4 GB).",
            "Transcode to multiple resolutions (360p / 720p / 1080p / 4k).",
            "Adaptive streaming via HLS or DASH.",
            "Resume playback from last position.",
            "Recommendations and search.",
        ],
        "non_functional_requirements": [
            "Time-to-first-frame under 2s globally.",
            "Survive an entire region going down.",
            "Tolerate flaky mobile networks (3G, packet loss).",
            "99.95% playback success rate.",
        ],
        "constraints": {
            "daily_active_users": 100_000_000,
            "videos_uploaded_per_day": 500_000,
            "hours_watched_per_day": 1_000_000_000,
        },
        "tags": ["CDN", "HLS", "encoding"],
    },
    {
        "id": "payment",
        "title": "Design a payment processor",
        "difficulty": Difficulty.hard,
        "statement": (
            "Design a service that charges a customer's card and credits a merchant. "
            "Money must move exactly once even when networks drop, services restart, "
            "or downstream banks time out."
        ),
        "functional_requirements": [
            "Accept a charge request (amount, currency, card token, merchant id).",
            "Idempotent retries via a client-supplied idempotency key.",
            "Authorize, capture, and refund flows.",
            "Webhook merchants on terminal state changes.",
            "Daily reconciliation against the card network.",
        ],
        "non_functional_requirements": [
            "Strong consistency on the ledger — no double charges or lost credits.",
            "Auditable: every state change is an immutable event.",
            "PCI-DSS compliant handling of card data.",
            "End-to-end charge latency p99 under 3s.",
        ],
        "constraints": {
            "transactions_per_second_peak": 5_000,
            "transactions_per_day": 100_000_000,
            "average_amount_usd": 35,
        },
        "tags": ["idempotency", "double-write", "audit"],
    },
    {
        "id": "notification",
        "title": "Design a notification system",
        "difficulty": Difficulty.medium,
        "statement": (
            "Design a service that delivers notifications to users across multiple "
            "channels (push, email, SMS, in-app). Other services emit events; this "
            "system decides who to notify and over which channel."
        ),
        "functional_requirements": [
            "Accept notification events from upstream services.",
            "Honor per-user channel preferences and quiet hours.",
            "Fan out to APNs, FCM, email provider, SMS provider.",
            "Bounded retries on transient delivery failures.",
            "Aggregate / digest low-priority notifications.",
        ],
        "non_functional_requirements": [
            "Time-critical notifications delivered within 5s of event.",
            "At-least-once delivery; dedupe at the channel layer.",
            "No infinite retry loops on permanent failures.",
            "Scale to bursts (e.g. a viral post triggers millions of pushes).",
        ],
        "constraints": {
            "notifications_per_day": 10_000_000_000,
            "peak_qps": 500_000,
            "channels": ["push", "email", "sms", "in-app"],
        },
        "tags": ["fan-out", "preferences", "delivery"],
    },
    {
        "id": "ride-sharing",
        "title": "Design a ride-sharing service",
        "difficulty": Difficulty.hard,
        "statement": (
            "Design Uber / Lyft: match riders requesting a trip with nearby available "
            "drivers in real time. Driver and rider locations stream continuously; "
            "matching must be fast, fair, and globally consistent on the trip state."
        ),
        "functional_requirements": [
            "Driver app pushes location every few seconds while available.",
            "Rider requests a trip from point A to point B.",
            "Match rider to nearest available driver.",
            "Live driver location during the trip.",
            "Fare calculation and payment at trip end.",
        ],
        "non_functional_requirements": [
            "Match-to-driver-notified under 5s.",
            "Location updates absorbed at scale without lag.",
            "Trip state strongly consistent (no double-assignment).",
            "Geographically partitioned: an outage in one city shouldn't break others.",
        ],
        "constraints": {
            "active_drivers_peak": 1_000_000,
            "trips_per_day": 25_000_000,
            "location_updates_per_second": 5_000_000,
        },
        "tags": ["geospatial", "matching", "realtime"],
    },
    {
        "id": "distributed-cache",
        "title": "Design a distributed cache",
        "difficulty": Difficulty.medium,
        "statement": (
            "Design a Memcached / Redis-like in-memory key/value cache that can scale "
            "horizontally across a fleet of machines. Clients should be able to put, "
            "get, and expire keys with predictable latency."
        ),
        "functional_requirements": [
            "GET / SET / DELETE on string keys with TTL.",
            "Consistent hashing so adding a node doesn't invalidate the whole cache.",
            "Replication for hot keys.",
            "LRU and TTL eviction policies.",
            "Client-side or proxy-based sharding.",
        ],
        "non_functional_requirements": [
            "GET / SET p99 under 5ms within a region.",
            "Survive single-node failure with no data loss for replicated keys.",
            "Stale or missing data is acceptable (it's a cache).",
            "Resharding on node add/remove rebalances <10% of keys.",
        ],
        "constraints": {
            "total_capacity_gb": 1_000,
            "ops_per_second": 10_000_000,
            "max_value_size_kb": 1_024,
        },
        "tags": ["consistent-hash", "eviction", "replication"],
    },
    # ─── Design pattern problems ──────────────────────────────────────────────
    # Pattern problems are framed by a single statement — the "what to build"
    # is the whole prompt. FR/NFR/constraints stay empty (the panel hides
    # them); tags carry the GoF category for filtering.
    {
        "id": "singleton-config",
        "title": "Singleton: app-wide configuration store",
        "kind": ProblemKind.design_pattern,
        "difficulty": Difficulty.easy,
        "statement": (
            "Design a configuration store that any module in an application can read "
            "from. There must be exactly one instance for the lifetime of the process, "
            "lazily initialized on first access, and safe to use from multiple threads. "
            "Sketch the class structure: who owns the instance, how it's accessed, and "
            "what stops a second copy from being created."
        ),
        "functional_requirements": [],
        "non_functional_requirements": [],
        "constraints": {},
        "tags": ["creational", "singleton", "thread-safety"],
    },
    {
        "id": "observer-stock-ticker",
        "title": "Observer: stock price ticker",
        "kind": ProblemKind.design_pattern,
        "difficulty": Difficulty.easy,
        "statement": (
            "Design a stock price ticker where many displays (web dashboard, mobile "
            "widget, audit log) react to price updates without the price feed knowing "
            "about any specific display. Sketch the Subject + Observer relationship so "
            "new display types can plug in without modifying the publisher."
        ),
        "functional_requirements": [],
        "non_functional_requirements": [],
        "constraints": {},
        "tags": ["behavioral", "observer", "pub-sub"],
    },
    {
        "id": "factory-shape-renderer",
        "title": "Factory Method: shape renderer",
        "kind": ProblemKind.design_pattern,
        "difficulty": Difficulty.medium,
        "statement": (
            "Design a drawing library where a single factory call creates the right "
            "Shape subclass (Circle, Square, Triangle, …) based on a string identifier. "
            "Sketch the class hierarchy so adding a new shape never touches the callers "
            "that ask for shapes."
        ),
        "functional_requirements": [],
        "non_functional_requirements": [],
        "constraints": {},
        "tags": ["creational", "factory", "open-closed"],
    },
    {
        "id": "strategy-checkout",
        "title": "Strategy: checkout pricing rules",
        "kind": ProblemKind.design_pattern,
        "difficulty": Difficulty.medium,
        "statement": (
            "Design a checkout calculator that applies pricing rules: percent-off "
            "coupons, fixed-amount discounts, buy-one-get-one, free shipping. Sketch "
            "the Cart + Strategy structure so the cart accepts any combination of "
            "rules without growing an if/else chain when marketing invents a new promo."
        ),
        "functional_requirements": [],
        "non_functional_requirements": [],
        "constraints": {},
        "tags": ["behavioral", "strategy", "composition"],
    },
    {
        "id": "decorator-coffee-shop",
        "title": "Decorator: coffee shop add-ons",
        "kind": ProblemKind.design_pattern,
        "difficulty": Difficulty.medium,
        "statement": (
            "Design pricing for a coffee shop where a Beverage can be wrapped in any "
            "combination of add-ons (Milk, Sugar, Whip, ExtraShot) — each adds to the "
            "cost and to the description. Sketch the wrapper hierarchy so you avoid "
            "the combinatorial explosion of MilkWhipEspresso subclasses."
        ),
        "functional_requirements": [],
        "non_functional_requirements": [],
        "constraints": {},
        "tags": ["structural", "decorator", "composition"],
    },
]


async def upsert_problem(session: AsyncSession, data: dict[str, Any]) -> str:
    existing = await session.get(Problem, data["id"])
    if existing:
        for key, value in data.items():
            if key == "id":
                continue
            setattr(existing, key, value)
        return "updated"
    session.add(Problem(**data))
    return "inserted"


async def main() -> None:
    inserted = updated = 0
    async with AsyncSessionMaker() as session:
        for data in PROBLEMS:
            outcome = await upsert_problem(session, data)
            if outcome == "inserted":
                inserted += 1
            else:
                updated += 1
        await session.commit()

        # Verify
        result = await session.execute(select(Problem.id, Problem.title).order_by(Problem.id))
        rows = result.all()

    print(f"Done — {inserted} inserted, {updated} updated.")
    print(f"\n{len(rows)} problems in the catalog:")
    for pid, title in rows:
        print(f"  {pid:22s} {title}")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
