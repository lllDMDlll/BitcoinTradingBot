import { OHLCOptions } from "./src/api-helpers/market-data";

import { Times } from "./src/enums/time";
import { Candle } from "./src/types/Candle";
import { DataUtil } from "./src/util/data";
import { PositionService } from "./src/services/PositionService";
import { krakenFuturesTestClient } from "./src/clients/kraken";
import { Exchanges } from "./src/enums/exchanges";
import { Markets } from "./src/enums/markets";
import { cw } from "./src/clients/cryptowatch";
import {Event} from "./src/types/Event";

export const handler = (event: Event) => {
    console.log("Starting Position lambda with the following event data: ", event);

    const dataUtils = new DataUtil();
    const tradingMode = dataUtils.getTradingMode(event);
    krakenFuturesTestClient.getOpenPositions().then((positions: any) => {
        const openPositions = positions.data.openPositions;
        krakenFuturesTestClient.getOpenOrders().then((orders: any) => {
            const openOrders = orders.data.openOrders;
            if(openPositions?.length === 0) {
                const activeOrders = openOrders?.filter(async (order: any) => {
                    if(order.orderType === "lmt") {
                        return true;
                    } else {
                        krakenFuturesTestClient.cancelOrder(order.order_id).then((resp: any) => {
                            if(resp.data.status === "success") {
                                console.log(`Order ${order.order_id} successfully canceled: `, resp.data);
                            } else {
                                console.log(`Failed to cancel order ${order.order_id}: `, resp.data);
                            }
                            return false;
                        });
                    }
                });
                if(activeOrders?.length === 0) {
                    const secondsTime = Math.floor(Date.now() / 1000);
                    const filterTime = secondsTime - 7*Times.DAY;
                    const candleOptions: OHLCOptions = {
                        before: secondsTime.toString(),
                        after: filterTime.toString(),
                        periods: '300,900,86400'
                    };

                    krakenFuturesTestClient.getPastFills().then((fillResp) => {
                        const fills = fillResp.data.fills;
                        const lastFillTime = new Date(fills[0].fillTime);
                        const fillTimeGap = (Date.now() - lastFillTime.getTime()) / 1000;
                        console.log(`Fill time gap: ${fillTimeGap}`);
                        if(fillTimeGap > Times.HOUR*12) {
                            cw.getOHLC(Exchanges.Kraken, Markets.BTC.USD, candleOptions).then((candles) => {
                                const fiveMinute = candles['300'].map((candle) => {
                                    return new Candle(
                                        Number(candle.highPrice),
                                        Number(candle.lowPrice),
                                        Number(candle.openPrice),
                                        Number(candle.closePrice),
                                        candle.closeTime
                                    )
                                });
                                const fifteenMinute = candles['900'].map((candle) => {
                                    return new Candle(
                                        Number(candle.highPrice),
                                        Number(candle.lowPrice),
                                        Number(candle.openPrice),
                                        Number(candle.closePrice),
                                        candle.closeTime
                                    )
                                });
                                const daily = candles['86400'].map((candle) => {
                                    return new Candle(
                                        Number(candle.highPrice),
                                        Number(candle.lowPrice),
                                        Number(candle.openPrice),
                                        Number(candle.closePrice),
                                        candle.closeTime
                                    )
                                });

                                const positionService = new PositionService(fiveMinute, daily, dataUtils);
                                fifteenMinute.forEach((current, i) => {
                                    const prev = i > 0 ? fifteenMinute[i - 1] : undefined;
                                    const prev2 = i > 1 ? fifteenMinute[i - 2] : undefined;

                                    dataUtils.setRanges(fifteenMinute, Number(current.time));

                                    if (prev && prev2) {
                                        // If it's the most recent candle, check for entry
                                        // Otherwise, continue detecting gaps and swings
                                        if (i >= (fifteenMinute.length - 2)) {
                                            console.log("Checking for entry on candle ", current);
                                            positionService.findEntry(current, prev, prev2, "BTC/USD", tradingMode, true).then((resp) => {
                                                console.log("FindEntry finished.");
                                                resp ? positionService.logEntries() : positionService.logMisses();
                                            });
                                        } else {
                                            dataUtils.detectSwingLow(current, prev, prev2);
                                            dataUtils.detectSwingHigh(current, prev, prev2);

                                            dataUtils.gapUps = dataUtils.gapUps.map((gap) => {
                                                gap.filled = gap.bottom >= current.low;
                                                return gap;
                                            });

                                            dataUtils.detectGapUp(current, prev, prev2);

                                            dataUtils.gapDowns = dataUtils.gapDowns.filter((gap) => {
                                                gap.filled = gap.top <= current.high;
                                                return gap;
                                            });

                                            dataUtils.detectGapDown(current, prev, prev2);
                                        }
                                    }
                                });
                            });
                        }
                    });
                } else {
                    if(!dataUtils.isWorkHours(new Date())) {
                        activeOrders.forEach((order: any) => {
                            krakenFuturesTestClient.cancelOrder(order.order_id).then((resp: any) => {
                                if(resp.data.status === "success") {
                                    console.log(`Order ${order.order_id} successfully canceled: `, resp.data);
                                } else {
                                    console.log(`Failed to cancel limit order ${order.order_id}: `, resp.data);
                                }
                                return false;
                            });
                        });
                    }
                }
            } else {
                if(openOrders?.length === 0) {
                    openPositions?.forEach((position: any) => {
                        if(position.side === "long") {
                            const sltp = dataUtils.getLongSLTP(position.price);
                            krakenFuturesTestClient.sendOrder(
                                "stp",
                                "PF_XBTUSD",
                                "sell",
                                position.size,
                                sltp.StopLoss,
                                sltp.StopLoss,
                                "mark"
                            ).then((resp1: any) => {
                                if(resp1.data.result === "success") {
                                    console.log("Long Stop Loss order was successful", JSON.stringify(resp1.data));
                                    krakenFuturesTestClient.sendOrder(
                                        "take_profit",
                                        "PF_XBTUSD",
                                        "sell",
                                        position.size,
                                        sltp.TakeProfit,
                                        sltp.TakeProfit,
                                        "mark"
                                    ).then((resp2: any) => {
                                        if(resp2.data.result === "success") {
                                            console.log("Long Take Profit order was successful", JSON.stringify(resp2.data));
                                        } else {
                                            console.log("Long Take Profit order failed: ", JSON.stringify(resp2.data));
                                        }
                                    });
                                } else {
                                    console.log("Long Stop Loss order failed: ", JSON.stringify(resp1.data));
                                }
                            });
                        } else {
                            const sltp = dataUtils.getShortSLTP(position.price);
                            krakenFuturesTestClient.sendOrder(
                                "stp",
                                "PF_XBTUSD",
                                "buy",
                                position.size,
                                sltp.StopLoss,
                                sltp.StopLoss,
                                "mark"
                            ).then((resp1: any) => {
                                if(resp1.data.result === "success") {
                                    console.log("Short Stop Loss order was successful", JSON.stringify(resp1.data));
                                    krakenFuturesTestClient.sendOrder(
                                        "take_profit",
                                        "PF_XBTUSD",
                                        "buy",
                                        position.size,
                                        sltp.TakeProfit,
                                        sltp.TakeProfit,
                                        "mark"
                                    ).then((resp2: any) => {
                                        if(resp2.data.result === "success") {
                                            console.log("Short Take Profit order was successful", JSON.stringify(resp2.data));
                                        } else {
                                            console.log("Short Take Profit order failed: ", JSON.stringify(resp2.data));
                                        }
                                    });
                                } else {
                                    console.log("Short Stop Loss order failed: ", JSON.stringify(resp1.data));
                                }
                            });
                        }
                    });
                } else if(openOrders?.length === 1) {
                    const curOrder = openOrders[0];
                    if(curOrder.orderType !== 'limit') {
                        openPositions?.forEach((position: any) => {
                            if(position.side === 'long') {
                                const sltp = dataUtils.getLongSLTP(position.price);
                                console.log("Long SLTP", sltp);
                                const orderType = curOrder.orderType === 'stop' ? 'take_profit' : 'stp';
                                console.log("Current order type: ", curOrder.orderType);
                                console.log("New order type: ", orderType);
                                krakenFuturesTestClient.sendOrder(
                                    orderType,
                                    "PF_XBTUSD",
                                    position.side === 'short' ? 'buy' : 'sell',
                                    position.size,
                                    orderType === 'stp' ? sltp.TakeProfit : sltp.StopLoss,
                                    orderType === 'stp' ? sltp.TakeProfit : sltp.StopLoss,
                                    "mark"
                                ).then((resp2: any) => {
                                    if(resp2.data.result === "success") {
                                        console.log("Long exit order was successful", JSON.stringify(resp2.data));
                                    } else {
                                        console.log("Long exit order failed: ", JSON.stringify(resp2.data));
                                    }
                                });
                            } else if(position.side === 'short') {
                                const sltp = dataUtils.getShortSLTP(position.price);
                                console.log("Short SLTP", sltp);
                                const orderType = curOrder.orderType === 'stop' ? 'take_profit' : 'stp';
                                console.log("Current order type: ", curOrder.orderType);
                                console.log("New order type: ", orderType);
                                krakenFuturesTestClient.sendOrder(
                                    orderType,
                                    "PF_XBTUSD",
                                    position.side === 'short' ? 'buy' : 'sell',
                                    position.size,
                                    orderType === 'stp' ? sltp.TakeProfit : sltp.StopLoss,
                                    orderType === 'stp' ? sltp.TakeProfit : sltp.StopLoss,
                                    "mark"
                                ).then((resp2: any) => {
                                    if(resp2.data.result === "success") {
                                        console.log("Short exit order was successful", JSON.stringify(resp2.data));
                                    } else {
                                        console.log("Short exit order failed: ", JSON.stringify(resp2.data));
                                    }
                                });
                            }
                        });
                    }
                }
            }
        });
    });
};