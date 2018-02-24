export class Event {
  ctrl: any;
  UI: any;

  constructor(ctrl: any) {
    this.ctrl = ctrl;
    this.UI = ctrl.UI;
  }

  // 通用事件处理器
  // 目前尚未使用
  wsEvent(event: any) {
    if (event.eventType) {
      var type = event.eventType;
      if (type == 'depthUpdate') {
        //
      } else if (type == 'aggTrade') {
        // moduleObj.UI.addTrade(event.eventTime, event.symbol, event.tradeId, event.price, event.quantity);
        // console.log("handle.wsEvent().aggTrade(): ", event);
      } else {
        //console.log("handle.wsEvent(): ", event);
      }
    }
  }
}
