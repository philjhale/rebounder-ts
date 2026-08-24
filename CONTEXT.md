# Rebounder

A browser/TypeScript port of the Unity game *Rebounder*: the player draws rotatable line segments to deflect coloured balls fired from launchers into matching-coloured targets. Ported from the Unity source at [`rebounder-unity-reference`](../rebounder-unity-reference), which remains the reference implementation.

## Language

**Line**:
A player-drawn segment the player can rotate (by dragging one end) or drag bodily. A coloured Line only physically deflects Balls of its own Colour; an Orange Line deflects Balls of any Colour, since Orange has no colour-specific physics layer in the original. Called "Rebounder" in the game's own art/branding (`Rebounder.png`), but the codebase — and this port — calls it a Line.
_Avoid_: Rebounder, Paddle, Rail

**LineHandle**:
One of the two draggable endpoints of a Line; dragging a handle rotates the Line around its other end.

**LineMiddle**:
The body of a Line between its two LineHandles — the part Balls actually collide with, and what a full Line drag grabs.

**LineCounts**:
The per-Level budget of how many Lines of each Colour the player is allowed to have drawn at once. Drawing a Line consumes one; deleting it refunds one.

**Ball**:
A constant-speed, colour-tagged projectile fired by a Launcher. Deflects off Obstacles physically regardless of Colour, but off a Line only when the Ball or the Line is Orange or their Colours match; only scores against a Target of its own Colour.

**Launcher**:
A fixed-position, fixed-Colour emitter that fires Balls on a timer. A short tap toggles all Launchers on the Level on/off; a long-press-and-release on a Launcher destroys every Ball currently in play.

**Target**:
A fixed-position, fixed-Colour goal. Reaching 5 hits from matching-Colour Balls completes it; an unhit Target "drains" one hit every 2 seconds. All Targets on a Level must be at/above the hit threshold simultaneously to complete the Level.

**TargetHit**:
One visual pip on a Target showing a single unit of hit progress toward the completion threshold.

**Obstacle**:
Static, solid level geometry (an axis-aligned box) that Balls bounce off. Unlike a Line, an Obstacle is fixed level layout, not something the player draws or moves.

**Teleporter**:
A fixed-position entity paired with exactly one other Teleporter. A Ball touching one is instantly repositioned to its pair's location, keeping its direction of travel.

**ColourChanger**:
A static, fixed-Colour pickup. A Ball touching it is recoloured to the ColourChanger's Colour.

**Colour**:
The enum shared by Balls, Targets, Lines, Launchers, and ColourChangers: `None | Orange | Blue | Green | Purple`. Governs which entities can interact with which.

**Level**:
One self-contained puzzle: a fixed set of Launchers, Targets, Obstacles, Teleporter pairs, ColourChangers, and a LineCounts budget. Completing every Target's threshold ends the Level.
