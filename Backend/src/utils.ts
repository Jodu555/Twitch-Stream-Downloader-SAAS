
export function bytesToHumanReadable(size: number, breakSize = 1024) {
    let u = 0;
    while (size >= breakSize || -size >= breakSize) {
        size /= breakSize;
        u++;
    }
    return (u ? size.toFixed(1) + ' ' : size) + ' KMGTPEZY'[u] + 'B';
}


export function formatNumPrec(num: number | string, precision: number) {
    return parseFloat(num.toString()).toFixed(precision);
}