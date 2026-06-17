# Delivery & Handoff Note

**Deliverable:** A software tool ("Solana Memecoin Launcher") that creates a standard SPL
token on Solana — it creates the mint, attaches metadata, mints the supply to the operator's
own wallet, and revokes the mint and freeze authorities. Source and documentation are
included in this folder.

**How it operates:** The tool is run by the client (the operator) on the client's own
machine, using the client's own wallet keypair and the client's own SOL. Every on-chain
action is signed by the client's wallet. The developer does not run the tool against
mainnet, does not provide or hold any wallet, keypair, mint authority, freeze authority, or
liquidity, and retains no control over any token created with it.

**Out of scope (intentionally not part of this software):**
- Creating or managing liquidity pools (the operator does this themselves via Raydium).
- Marketing, promotion, listings, or trading of any token.
- Any custody, control, or operation of tokens after delivery.

**Status:** The software is delivered as working source. The operator is solely responsible
for how it is used, for any token launched with it, for compliance with applicable laws in
their jurisdiction, and for all consequences of operating it.

---

_Fill in before sending:_

- Delivered by: ______________________
- Delivered to: ______________________
- Date: ______________________
- Agreed fee / payment terms: ______________________
