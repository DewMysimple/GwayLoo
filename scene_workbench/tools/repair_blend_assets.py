from __future__ import annotations

import json
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))

from portable_blend_assets import make_blend_assets_portable


WORKBENCH = Path(__file__).resolve().parents[1]
BLEND = WORKBENCH / "blender/Verminoble_Scene_Mirror_5_0.blend"


def main() -> None:
    bpy.ops.wm.open_mainfile(filepath=str(BLEND))
    summary = make_blend_assets_portable(BLEND.parent)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND), check_existing=False)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if not summary["passed"]:
        raise RuntimeError(f"Unresolved Blender assets: {summary}")


if __name__ == "__main__":
    main()
