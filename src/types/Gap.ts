enum GapType {
    Up,
    Down
}

class Gap {
    top: number;
    middle: number;
    bottom: number;
    time: number;
    type: GapType;
    filled: boolean;

    constructor(top: number, middle: number, bottom: number, time: number, type: GapType) {
        this.top = top;
        this.middle = middle;
        this.bottom = bottom;
        this.time = time;
        this.type = type;
        this.filled = false;
    }

    fillGap = () => {
        this.filled = true;
    }
}

export { Gap, GapType }