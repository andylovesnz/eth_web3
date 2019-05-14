import { BytesLike } from "@ethersproject/bytes";
import { BigNumber, BigNumberish } from "./bignumber";
export declare function formatFixed(value: BigNumberish, decimals?: string | BigNumberish): string;
export declare function parseFixed(value: string, decimals?: BigNumberish): BigNumber;
export declare class FixedFormat {
    readonly signed: boolean;
    readonly width: number;
    readonly decimals: number;
    readonly name: string;
    readonly _multiplier: BigNumber;
    constructor(constructorGuard: any, signed: boolean, width: number, decimals: number);
    static from(value: any): FixedFormat;
    static isInstance(value: any): value is FixedFormat;
}
export declare class FixedNumber {
    readonly format: FixedFormat;
    readonly _hex: string;
    readonly _value: string;
    constructor(constructorGuard: any, hex: string, value: string, format?: FixedFormat);
    _checkFormat(other: FixedNumber): void;
    addUnsafe(other: FixedNumber): FixedNumber;
    subUnsafe(other: FixedNumber): FixedNumber;
    mulUnsafe(other: FixedNumber): FixedNumber;
    divUnsafe(other: FixedNumber): FixedNumber;
    round(decimals?: number): FixedNumber;
    toString(): string;
    toHexString(width?: number): string;
    toUnsafeFloat(): number;
    toFormat(format: FixedFormat | string): FixedNumber;
    static fromValue(value: BigNumber, decimals?: BigNumberish, format?: FixedFormat | string): FixedNumber;
    static fromString(value: string, format?: FixedFormat | string): FixedNumber;
    static fromBytes(value: BytesLike, format?: FixedFormat | string): FixedNumber;
    static from(value: any, format?: FixedFormat | string): FixedNumber;
    static isFixedNumber(value: any): value is FixedNumber;
}
