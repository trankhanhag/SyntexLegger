/**
 * Chuyển số thành chữ tiếng Việt (Currency)
 */
export function toVietnameseWords(number: number): string {
    if (number === 0) return "Không đồng";

    const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

    function readThree(n: number, showZero: boolean): string {
        const h = Math.floor(n / 100);
        const t = Math.floor((n % 100) / 10);
        const u = n % 10;
        let res = "";

        if (h > 0) {
            res += units[h] + " trăm ";
        } else if (showZero) {
            res += "không trăm ";
        }

        if (t > 1) {
            res += units[t] + " mươi ";
            if (u === 1) res += "mốt ";
            else if (u === 5) res += "lăm ";
            else if (u > 0) res += units[u] + " ";
        } else if (t === 1) {
            res += "mười ";
            if (u === 5) res += "lăm ";
            else if (u > 0) res += units[u] + " ";
        } else {
            if (u > 0) {
                if (h > 0 || showZero) res += "lẻ ";
                res += units[u] + " ";
            }
        }
        return res;
    }

    let res = "";
    let n = Math.abs(Math.floor(number));
    const suffixes = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
    let i = 0;

    while (n > 0) {
        const three = n % 1000;
        if (three > 0) {
            res = readThree(three, n > 999) + suffixes[i] + " " + res;
        }
        n = Math.floor(n / 1000);
        i++;
    }

    res = res.trim();
    if (res.length > 0) {
        res = res.charAt(0).toUpperCase() + res.slice(1) + " đồng chẵn./.";
    }

    return res;
}
