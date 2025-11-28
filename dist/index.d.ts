declare class CronToolkit {
    readonly expression: string;
    private nodes;
    private _timeZone;
    private _utcOffset;
    private _beginEpoch;
    private _endEpoch;
    constructor(expression: string, options?: {
        time_zone?: string;
        utc_offset?: number;
    });
    get time_zone(): string;
    set time_zone(tz: string);
    get utc_offset(): number;
    set utc_offset(offset: number);
    get begin_epoch(): number;
    set begin_epoch(epoch: number);
    get end_epoch(): number | undefined;
    set end_epoch(epoch: number | undefined);
    private parse;
    private finalizeDow;
    private buildNode;
    private _optimizeNode;
    private _setField;
    private _plus_one;
    private _minus_one;
    next(from?: number): number | null;
    previous(from?: number): number | null;
    private matches;
    describe(): string;
    asString(): string;
    asQuartzString(): string;
    dumpTree(): string;
}

export { CronToolkit };
