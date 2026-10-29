from typing import Dict, Tuple, List, Any


def compute_template_positions(roots: List[Dict[str, Any]], layout_mode: str = "radial") -> Dict[str, Tuple[float, float]]:
    """
    Computes deterministic, collision-free (x, y) coordinates for all nodes in a template blueprint tree
    at any arbitrary depth.
    
    Supports:
    - 'radial': Balanced 2-sided mind map matching MindVault Phase 3 design
    - 'horizontal': Left-to-right hierarchy with vertical slot allocation
    - 'vertical': Top-to-bottom hierarchy with horizontal slot allocation
    """
    positions: Dict[str, Tuple[float, float]] = {}
    if not roots:
        return positions

    root = roots[0]
    root_label = root.get("label", "Root")
    positions[root_label] = (0.0, 0.0)

    topics = root.get("children", [])
    if not topics:
        return positions

    mode = (layout_mode or "radial").lower().strip()

    # Pre-calculate leaf counts for every subtree
    leaf_weights: Dict[str, int] = {}

    def calc_leaf_weight(node: Dict[str, Any]) -> int:
        lbl = node.get("label", "")
        children = node.get("children", [])
        if not children:
            leaf_weights[lbl] = 1
            return 1
        w = sum(calc_leaf_weight(c) for c in children)
        leaf_weights[lbl] = max(1, w)
        return max(1, w)

    calc_leaf_weight(root)

    if mode == "radial":
        SPACING_X_TOPIC = 310.0
        SPACING_X_SUB = 260.0
        SLOT_HEIGHT = 85.0

        # Partition topics into Right and Left hemispheres
        right_topics: List[Dict[str, Any]] = []
        left_topics: List[Dict[str, Any]] = []

        half = (len(topics) + 1) // 2
        for i, t in enumerate(topics):
            if i < half:
                right_topics.append(t)
            else:
                left_topics.append(t)

        # 1. Right Hemisphere (+X)
        if right_topics:
            total_leaves = sum(leaf_weights.get(t.get("label", ""), 1) for t in right_topics)
            cur_y = [ -((total_leaves - 1) * SLOT_HEIGHT) / 2.0 ]

            def place_right(node: Dict[str, Any], depth: int) -> float:
                lbl = node.get("label", "")
                children = node.get("children", [])
                pos_x = SPACING_X_TOPIC + (depth - 1) * SPACING_X_SUB

                if not children:
                    pos_y = cur_y[0]
                    positions[lbl] = (round(pos_x, 1), round(pos_y, 1))
                    cur_y[0] += SLOT_HEIGHT
                    return pos_y

                child_ys = [place_right(c, depth + 1) for c in children]
                avg_y = (child_ys[0] + child_ys[-1]) / 2.0
                positions[lbl] = (round(pos_x, 1), round(avg_y, 1))
                return avg_y

            for t in right_topics:
                place_right(t, 1)

        # 2. Left Hemisphere (-X)
        if left_topics:
            total_leaves = sum(leaf_weights.get(t.get("label", ""), 1) for t in left_topics)
            cur_y = [ -((total_leaves - 1) * SLOT_HEIGHT) / 2.0 ]

            def place_left(node: Dict[str, Any], depth: int) -> float:
                lbl = node.get("label", "")
                children = node.get("children", [])
                pos_x = -(SPACING_X_TOPIC + (depth - 1) * SPACING_X_SUB)

                if not children:
                    pos_y = cur_y[0]
                    positions[lbl] = (round(pos_x, 1), round(pos_y, 1))
                    cur_y[0] += SLOT_HEIGHT
                    return pos_y

                child_ys = [place_left(c, depth + 1) for c in children]
                avg_y = (child_ys[0] + child_ys[-1]) / 2.0
                positions[lbl] = (round(pos_x, 1), round(avg_y, 1))
                return avg_y

            for t in left_topics:
                place_left(t, 1)

    elif mode == "vertical":
        SPACING_Y_TOPIC = 180.0
        SPACING_Y_SUB = 160.0
        SLOT_WIDTH = 260.0

        total_leaves = leaf_weights.get(root_label, 1)
        cur_x = [ -((total_leaves - 1) * SLOT_WIDTH) / 2.0 ]

        def place_vertical(node: Dict[str, Any], depth: int) -> float:
            lbl = node.get("label", "")
            children = node.get("children", [])
            pos_y = SPACING_Y_TOPIC + (depth - 1) * SPACING_Y_SUB

            if not children:
                pos_x = cur_x[0]
                positions[lbl] = (round(pos_x, 1), round(pos_y, 1))
                cur_x[0] += SLOT_WIDTH
                return pos_x

            child_xs = [place_vertical(c, depth + 1) for c in children]
            avg_x = (child_xs[0] + child_xs[-1]) / 2.0
            positions[lbl] = (round(avg_x, 1), round(pos_y, 1))
            return avg_x

        for t in topics:
            place_vertical(t, 1)

    else:
        # Horizontal (Left-to-Right)
        SPACING_X_TOPIC = 290.0
        SPACING_X_SUB = 260.0
        SLOT_HEIGHT = 85.0

        total_leaves = leaf_weights.get(root_label, 1)
        cur_y = [ -((total_leaves - 1) * SLOT_HEIGHT) / 2.0 ]

        def place_horizontal(node: Dict[str, Any], depth: int) -> float:
            lbl = node.get("label", "")
            children = node.get("children", [])
            pos_x = SPACING_X_TOPIC + (depth - 1) * SPACING_X_SUB

            if not children:
                pos_y = cur_y[0]
                positions[lbl] = (round(pos_x, 1), round(pos_y, 1))
                cur_y[0] += SLOT_HEIGHT
                return pos_y

            child_ys = [place_horizontal(c, depth + 1) for c in children]
            avg_y = (child_ys[0] + child_ys[-1]) / 2.0
            positions[lbl] = (round(pos_x, 1), round(avg_y, 1))
            return avg_y

        for t in topics:
            place_horizontal(t, 1)

    return positions
