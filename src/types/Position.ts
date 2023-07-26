enum PositionType {
    Long,
    Short
}

class Position {
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    entryTime: number;
    gapTime: number;
    type: PositionType;
    sellPrice?: number;
    sellTime?: number;
    open: boolean;

    constructor(entryPrice: number, stopLoss: number, takeProfit: number, entryTime: number, gapTime: number, type: PositionType) {
        this.entryPrice = entryPrice;
        this.stopLoss = stopLoss;
        this.takeProfit = takeProfit;
        this.entryTime = entryTime;
        this.gapTime = gapTime;
        this.type = type;
        this.open = true;
    }

    sell(sellPrice: number, sellTime: number) {
        this.sellPrice = sellPrice;
        this.sellTime = sellTime;
        this.open = false;
    }
}

export { Position, PositionType }