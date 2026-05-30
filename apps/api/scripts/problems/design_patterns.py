"""Design-pattern problem catalog.

These are framed by a single `statement` — the "what to build" is the whole
prompt. FR/NFR/constraints stay empty (the panel hides them); tags carry
the GoF category for filtering.

Tag conventions:
  - GoF category: "creational" | "structural" | "behavioral"
  - Specific pattern name as a tag: "singleton", "observer", "adapter", ...
"""

from typing import Any

from app.db.models import Difficulty, ProblemKind


PROBLEMS: list[dict[str, Any]] = [
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
    # ─── New additions ────────────────────────────────────────────────────────
    {
        "id": "adapter-legacy-logger",
        "title": "Adapter: legacy logger interface",
        "kind": ProblemKind.design_pattern,
        "difficulty": Difficulty.easy,
        "statement": (
            "Your app expects a modern Logger interface with one `log(level, message)` "
            "method. The only library available is a legacy one with separate "
            "`writeError(msg)`, `writeWarn(msg)`, `writeInfo(msg)` calls. Sketch an "
            "Adapter that wraps the legacy logger and exposes the modern interface — "
            "without changing either side."
        ),
        "functional_requirements": [],
        "non_functional_requirements": [],
        "constraints": {},
        "tags": ["structural", "adapter", "wrapping"],
    },
    {
        "id": "facade-home-theater",
        "title": "Facade: one-button home theater",
        "kind": ProblemKind.design_pattern,
        "difficulty": Difficulty.easy,
        "statement": (
            "A home theater has five subsystems: amplifier, projector, screen, lights, "
            "and player. Watching a movie means turning each one on in the right order, "
            "with the right input and volume. Sketch a Facade that exposes a single "
            "`watchMovie()` / `endMovie()` so clients don't have to know about any of "
            "the subsystems."
        ),
        "functional_requirements": [],
        "non_functional_requirements": [],
        "constraints": {},
        "tags": ["structural", "facade", "subsystem"],
    },
    {
        "id": "builder-sql-query",
        "title": "Builder: SQL query builder",
        "kind": ProblemKind.design_pattern,
        "difficulty": Difficulty.medium,
        "statement": (
            "Design a fluent SQL query builder that constructs SELECT statements step "
            "by step: `.select(...)`, `.from_(...)`, `.where(...)`, `.join(...)`, "
            "`.orderBy(...)`, `.limit(...)`. The final `.build()` returns the SQL "
            "string. Sketch the Builder class and how chained calls accumulate state."
        ),
        "functional_requirements": [],
        "non_functional_requirements": [],
        "constraints": {},
        "tags": ["creational", "builder", "fluent-api"],
    },
    {
        "id": "command-undoable-editor",
        "title": "Command: undoable text editor",
        "kind": ProblemKind.design_pattern,
        "difficulty": Difficulty.medium,
        "statement": (
            "Design a text editor where every action (insert, delete, format, paste) "
            "is a Command object the editor can execute, queue, and undo. Sketch the "
            "Command interface, the concrete commands, and the editor that owns a "
            "history stack."
        ),
        "functional_requirements": [],
        "non_functional_requirements": [],
        "constraints": {},
        "tags": ["behavioral", "command", "undo"],
    },
    {
        "id": "state-vending-machine",
        "title": "State: vending machine",
        "kind": ProblemKind.design_pattern,
        "difficulty": Difficulty.medium,
        "statement": (
            "Design a vending machine whose response to inputs (insert coin, select "
            "item, dispense) depends on its current state: idle, has-money, "
            "dispensing, out-of-stock. Sketch the Context (machine) and the State "
            "hierarchy so adding a new state doesn't sprawl into if/else chains."
        ),
        "functional_requirements": [],
        "non_functional_requirements": [],
        "constraints": {},
        "tags": ["behavioral", "state", "context"],
    },
    {
        "id": "composite-file-system",
        "title": "Composite: file system tree",
        "kind": ProblemKind.design_pattern,
        "difficulty": Difficulty.medium,
        "statement": (
            "Design a file-system model where Files and Directories share the same "
            "interface — `name()`, `size()`, `print(depth)` — and a Directory's size "
            "is the sum of its children's sizes. Sketch the Component (interface), "
            "Leaf (File), and Composite (Directory) so traversal code treats them "
            "uniformly."
        ),
        "functional_requirements": [],
        "non_functional_requirements": [],
        "constraints": {},
        "tags": ["structural", "composite", "tree"],
    },
    {
        "id": "template-method-beverage",
        "title": "Template Method: beverage brewing",
        "kind": ProblemKind.design_pattern,
        "difficulty": Difficulty.medium,
        "statement": (
            "Design a Beverage base class that defines the brewing algorithm — boil "
            "water → brew → pour → add condiments — as a fixed skeleton, but lets "
            "Tea and Coffee subclasses fill in the variable steps (`brew()` and "
            "`addCondiments()`). Sketch the abstract class with the template method "
            "and the two concrete subclasses."
        ),
        "functional_requirements": [],
        "non_functional_requirements": [],
        "constraints": {},
        "tags": ["behavioral", "template-method", "inheritance"],
    },
    {
        "id": "chain-of-responsibility-middleware",
        "title": "Chain of Responsibility: web middleware",
        "kind": ProblemKind.design_pattern,
        "difficulty": Difficulty.hard,
        "statement": (
            "Design a web request pipeline where each handler in a chain — auth, "
            "rate-limit, logging, route handler — either handles the request or "
            "passes it down the line. Sketch the Handler interface, how the chain is "
            "wired together, and how termination works (short-circuit on auth fail, "
            "fall-through to the final handler on success)."
        ),
        "functional_requirements": [],
        "non_functional_requirements": [],
        "constraints": {},
        "tags": ["behavioral", "chain-of-responsibility", "middleware"],
    },
]
