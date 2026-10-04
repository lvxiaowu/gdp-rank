// 分享卡片（原型文档 P09）：用离屏 canvas 动态画一张 5:4 图片作为转发卡片封面。
// 生成失败时不带图片，微信会用页面截图兜底。H5 预览不生成。
import { fmtGdp, fmtPct } from "./format";

export type ShareSpec =
  | {
      kind: "rank";
      title: string;
      rows: { rank: number | null; name: string; gdp: number; growth: number | null }[];
    }
  | {
      kind: "region";
      title: string;
      name: string;
      big: string;
      unit: string;
      growth: number | null;
      rankText: string;
    }
  | { kind: "compare"; title: string; bars: { name: string; gdp: number }[]; conclusion: string };

const W = 500;
const H = 400;
const BLUE = "#3370FF";
const SERIES = ["#3370FF", "#FF8800", "#00B42A", "#7B61FF"];

function draw(ctx: any, spec: ShareSpec) {
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = BLUE;
  ctx.fillRect(0, 0, W, 76);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 28px sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(spec.title, 28, 38);

  const growthColor = (g: number | null) =>
    g == null ? "#8F959E" : g >= 0 ? "#F54A45" : "#00B42A";

  if (spec.kind === "rank") {
    spec.rows.slice(0, 5).forEach((r, i) => {
      const y = 112 + i * 58;
      ctx.fillStyle = i < 3 ? ["#F7BA1E", "#A9AEB8", "#D98B4B"][i] : "#C9CDD4";
      ctx.beginPath();
      ctx.arc(46, y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(r.rank ?? "-"), 46, y);
      ctx.textAlign = "left";
      ctx.fillStyle = "#1F2329";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText(r.name, 80, y);
      ctx.textAlign = "right";
      ctx.font = "24px sans-serif";
      ctx.fillText(fmtGdp(r.gdp), 380, y);
      ctx.fillStyle = growthColor(r.growth);
      ctx.fillText(fmtPct(r.growth), 472, y);
      ctx.textAlign = "left";
    });
  } else if (spec.kind === "region") {
    ctx.fillStyle = "#1F2329";
    ctx.font = "bold 44px sans-serif";
    ctx.fillText(spec.name, 32, 140);
    ctx.fillStyle = BLUE;
    ctx.font = "bold 80px sans-serif";
    ctx.fillText(spec.big, 32, 240);
    const w = ctx.measureText(spec.big).width;
    ctx.font = "30px sans-serif";
    ctx.fillText(spec.unit, 44 + w, 252);
    ctx.font = "28px sans-serif";
    ctx.fillStyle = growthColor(spec.growth);
    ctx.fillText(`实际增速 ${fmtPct(spec.growth)}`, 32, 330);
    ctx.fillStyle = "#646A73";
    ctx.textAlign = "right";
    ctx.fillText(spec.rankText, 468, 330);
    ctx.textAlign = "left";
  } else {
    const max = Math.max(...spec.bars.map((b) => b.gdp), 1);
    spec.bars.slice(0, 4).forEach((b, i) => {
      const y = 116 + i * 52;
      ctx.fillStyle = "#1F2329";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText(b.name, 28, y);
      ctx.fillStyle = SERIES[i];
      ctx.fillRect(120, y - 14, (260 * b.gdp) / max, 28);
      ctx.fillStyle = "#646A73";
      ctx.font = "20px sans-serif";
      ctx.fillText(fmtGdp(b.gdp), 390, y);
    });
    // 结论文字按宽度折行
    ctx.fillStyle = "#1F2329";
    ctx.font = "22px sans-serif";
    let line = "";
    let y = 116 + Math.min(spec.bars.length, 4) * 52 + 16;
    for (const ch of spec.conclusion) {
      if (ctx.measureText(line + ch).width > W - 56) {
        ctx.fillText(line, 28, y);
        line = ch;
        y += 32;
        if (y > H - 20) break;
      } else line += ch;
    }
    if (y <= H - 20) ctx.fillText(line, 28, y);
  }
}

export function makeShareImage(spec: ShareSpec): Promise<string | undefined> {
  // #ifdef MP-WEIXIN
  return new Promise((resolve) => {
    try {
      const canvas = wx.createOffscreenCanvas({ type: "2d", width: W, height: H });
      draw(canvas.getContext("2d"), spec);
      wx.canvasToTempFilePath({
        canvas,
        fileType: "png",
        success: (res: { tempFilePath: string }) => resolve(res.tempFilePath),
        fail: () => resolve(undefined),
      });
    } catch {
      resolve(undefined);
    }
  });
  // #endif
  return Promise.resolve(undefined);
}

/**
 * onShareAppMessage 的返回值。微信支持返回 promise，3 秒内完成就用生成的图片。
 */
export function shareMessage(title: string, path: string, spec?: ShareSpec) {
  const base = { title, path };
  if (!spec) return base;
  return {
    ...base,
    promise: makeShareImage(spec).then((imageUrl) => (imageUrl ? { ...base, imageUrl } : base)),
  };
}
