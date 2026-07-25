# AGENTS.md

## Project

Multi-exchange crypto arbitrage, spread and funding analytics platform.

The complete product specification is located at:

docs/MASTER_SPEC.md

Read it before making architectural or implementation decisions.

## Core rules

1. Never attempt to implement the whole product in one task.
2. Work only on the currently approved development phase.
3. Before coding, provide a short implementation plan.
4. Do not invent exchange API endpoints.
5. Use official exchange documentation only.
6. Never use float or double for prices, quantities or financial calculations.
7. Do not hardcode funding intervals or symbol mappings.
8. Keep every exchange integration isolated behind a common adapter interface.
9. Never log API keys, signatures, private keys or authentication payloads.
10. Never blindly retry an order after a timeout or HTTP 5xx response.
11. Always reconcile the order status before retrying.
12. AI components must never bypass the Risk Engine.
13. Live trading must remain disabled by default.
14. Paper trading must be completed before live execution is implemented.
15. All new functionality must include tests, error handling, metrics and documentation.
16. Mark stale or degraded market data explicitly.
17. Keep USDT and USDC instruments separate.
18. Create database changes only through migrations.
19. Do not introduce unnecessary infrastructure before it is required.
20. Ask for approval before beginning the next development phase.

## Workflow

For every task:

1. Read the relevant documentation.
2. Inspect the current repository.
3. Describe the proposed implementation.
4. Identify risks and ambiguities.
5. Implement only the requested scope.
6. Run formatting, linting, type checking and tests.
7. Report:
   - changed files;
   - implemented functionality;
   - executed tests;
   - unresolved issues;
   - recommended next task.

## Safety

Do not place real trades or use production API credentials.

Use mocks, recorded fixtures, sandboxes and exchange testnets until live
trading is explicitly approved.