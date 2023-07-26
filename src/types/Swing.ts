enum SwingType {
    High,
    Low
}

class Swing {
    high: number;
    low: number;
    time: number;
    type: SwingType;
    broken: boolean;

    constructor(high: number, low: number, time: number, type: SwingType) {
        this.high = high;
        this.low = low;
        this.time = time;
        this.type = type;
        this.broken = false;
    }

    breakSwing = () => this.broken = true;
}

export { Swing, SwingType }