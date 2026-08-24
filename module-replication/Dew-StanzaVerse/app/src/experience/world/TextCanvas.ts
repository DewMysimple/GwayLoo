/**
 * TextCanvas —— 把 DOM 诗句离屏渲染成 CanvasTexture。
 *
 * 对应原站的 AK 类（挂在 .xp-text-w-inside 上）：主滚动页保留两份
 * 诗句 DOM 并动态绘制三瓦片 Canvas；Poem 视图另外消费同一类中的
 * 固定 hK 数据、四瓦片 UV 与 poem/texture 资源契约。
 *
 * 画布布局（横向三瓦片）：
 *   [ 清晰 ] [ 低模糊 ] [ 高模糊 ]
 * 每个瓦片包含完整的 3 节诗句竖向堆叠。
 */
import * as THREE from "three";
import { resources } from "../../core/Resources";
import { experienceDefinition, type ExperienceDefinition } from "../definition";

const TILE_PADDING = 24;

const SOURCE_POEM_DESPAIR = [
  "Despair takes us in when we have nowhere else to go;",
  "when we feel the heart cannot break anymore,",
  "when our world or our loved ones disappear,",
  "when we feel we cannot be loved or do not deserve to be loved,",
  "when our God disappoints,",
  "or when our body is carrying profound pain in a way that does not seem to go away.",
].join(" ");

export interface SourcePoemTextData {
  width: number;
  height: number;
  fontSize: string;
  lineHeight: number;
  paragraphs: string[][];
  color: string;
  scrollHeight: number;
}

export const SOURCE_POEM_TEXT_DATA: SourcePoemTextData = {
  width: 400,
  height: 2304,
  fontSize: "30px",
  lineHeight: 48,
  paragraphs: [
    ["You start", "with a painter’s hand", "working up color", "from a dark palette", "of remembrance", "(from “The Painter’s Hand”)"] ,
    ["What you can plan", "is too small", "for you to live."],
    ["What you can live", "wholeheartedly", "will make plans", "enough", "for the vitality", "hidden in your sleep.", "(from “What to Remember When Waking”)"] ,
    ["Time to go into the dark", "where the night has eyes", "to recognize its own."],
    ["There you can be sure", "you are not beyond love."],
    ["The dark will be your home", "tonight.", "(from “Sweet Darkness”)"] ,
    [SOURCE_POEM_DESPAIR, "(from “Despair”)"]
  ],
  color: "rgb(255, 0, 0)",
  scrollHeight: 2304,
};

const SOURCE_POEM_TILE_WIDTH = SOURCE_POEM_TEXT_DATA.width + 20;
const SOURCE_POEM_FULL_WIDTH = SOURCE_POEM_TILE_WIDTH * 4;
const SOURCE_POEM_ASPECT = SOURCE_POEM_FULL_WIDTH / SOURCE_POEM_TEXT_DATA.height;

function createSourcePoemBoxes(): { pixel: TextCanvasBox[]; uv: TextCanvasBox[] } {
  const pixel: TextCanvasBox[] = [];
  const uv: TextCanvasBox[] = [];
  for (let tile = 0; tile < 4; tile++) {
    const minX = SOURCE_POEM_TILE_WIDTH * tile + 10;
    const maxX = minX + SOURCE_POEM_TEXT_DATA.width;
    pixel.push({ min: new THREE.Vector2(minX, 0), max: new THREE.Vector2(maxX, SOURCE_POEM_TEXT_DATA.height) });
    const uvMinX = ((minX + (tile === 2 ? 10 : 0)) / SOURCE_POEM_FULL_WIDTH) * SOURCE_POEM_ASPECT;
    const uvMaxX = ((maxX + (tile === 2 ? 10 : 0)) / SOURCE_POEM_FULL_WIDTH) * SOURCE_POEM_ASPECT;
    uv.push({ min: new THREE.Vector2(uvMinX, 0), max: new THREE.Vector2(uvMaxX, 1) });
  }
  return { pixel, uv };
}

const SOURCE_POEM_BOXES = createSourcePoemBoxes();

export interface TextCanvasBox {
  min: THREE.Vector2;
  max: THREE.Vector2;
}

export class TextCanvas {
  texture: THREE.CanvasTexture | null = null;
  private _fontFamily: string;

  constructor(definition: ExperienceDefinition = experienceDefinition) {
    this._fontFamily = definition.fonts.canelaThin.family;
  }

  /** 原始 AK 的 Poem 纹理与固定 hK 布局；主滚动页仍使用上面的 DOM 纹理。 */
  get poemTexture(): THREE.Texture | null {
    if (!resources.has("poem/texture")) return null;
    const texture = resources.get<THREE.Texture>("poem/texture");
    texture.flipY = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }

  get poemCanvasPixelHeight(): number {
    return SOURCE_POEM_TEXT_DATA.scrollHeight;
  }

  get poemTileRatio(): number {
    return SOURCE_POEM_TEXT_DATA.width / SOURCE_POEM_TEXT_DATA.height;
  }

  get poemUvBoxes(): TextCanvasBox[] {
    return SOURCE_POEM_BOXES.uv;
  }

  get poemPixelBoxes(): TextCanvasBox[] {
    return SOURCE_POEM_BOXES.pixel;
  }

  /** 内容尺寸（CSS px） */
  contentWidth = 0;
  contentHeight = 0;
  /** 单瓦片宽度（CSS px） */
  tileWidth = 0;

  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _imageData: ImageData | null = null;
  private _dpr = 2;
  private _mobile = false;
  /** 每节诗句在内容中的纵向区间（0~1，相对内容总高） */
  sectionRanges: { min: number; max: number }[] = [];
  /** 三个文字瓦片在 Canvas 纹理中的 UV 区域：[sharp, low blur, high blur] */
  private _uvBoxes: TextCanvasBox[] = [];
  /** 三个文字瓦片在 Canvas 像素坐标中的区域 */
  private _pixelBoxes: TextCanvasBox[] = [];

  /** 等字体就绪后绘制 */
  async prepare(): Promise<void> {
    const fontSize = window.innerWidth < 768 ? 25 : 30;
    await document.fonts.load(`100 ${fontSize}px "${this._fontFamily}"`);
    await document.fonts.ready;
    this._render();
  }

  get canvasPixelHeight(): number {
    return this._canvas?.height ?? 0;
  }

  get canvasPixelWidth(): number {
    return this._canvas?.width ?? 0;
  }

  get uvBoxes(): TextCanvasBox[] {
    return this._uvBoxes;
  }

  get pixelBoxes(): TextCanvasBox[] {
    return this._pixelBoxes;
  }

  private _extractSections(): string[][] {
    const sections: string[][] = [];
    const readLines = (root: Node): string[] => {
      const lines: string[] = [""];
      const visit = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          lines[lines.length - 1] += node.textContent ?? "";
          return;
        }
        if (!(node instanceof HTMLElement)) return;
        if (node.tagName === "BR") {
          lines.push("");
          return;
        }
        const block = /^(DIV|P)$/.test(node.tagName);
        if (block && lines[lines.length - 1].trim()) lines.push("");
        node.childNodes.forEach(visit);
        if (block && lines[lines.length - 1].trim()) lines.push("");
      };
      root.childNodes.forEach(visit);
      return lines.map((line) => line.trim()).filter((line, index, all) => line || (index > 0 && all[index - 1]));
    };
    document.querySelectorAll(".xp-text-w-inside .xp-text").forEach((el) => {
      const lines = readLines(el);
      // 去掉末尾空行
      while (lines.length && lines[lines.length - 1] === "") lines.pop();
      sections.push(lines);
    });
    return sections;
  }

  private _render(): void {
    const sections = this._extractSections();
    if (!sections.length) return;

    const dpr = this._dpr;
    this._mobile = window.innerWidth < 768;
    const fontSize = this._mobile ? 25 : 30;
    const lineHeight = this._mobile ? 40 : 48;
    // 测量
    const measurer = document.createElement("canvas").getContext("2d")!;
    measurer.font = `100 ${fontSize}px "${this._fontFamily}"`;
    let maxWidth = 0;
    let totalLines = 0;
    this.sectionRanges = [];
    let accLines = 0;
    sections.forEach((lines) => {
      this.sectionRanges.push({ min: 0, max: 0 }); // 稍后填充
      lines.forEach((l) => {
        maxWidth = Math.max(maxWidth, measurer.measureText(l).width);
        totalLines++;
      });
      accLines += lines.length + 1; // 节间空一行
    });
    totalLines += sections.length; // 节间距

    this.tileWidth = Math.ceil(maxWidth + TILE_PADDING * 2);
    this.contentWidth = this.tileWidth;
    this.contentHeight = totalLines * lineHeight + TILE_PADDING * 2;

    const canvas = document.createElement("canvas");
    canvas.width = this.tileWidth * 3 * dpr;
    canvas.height = this.contentHeight * dpr;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    this._canvas = canvas;
    this._ctx = ctx;
    this._uvBoxes = [];
    this._pixelBoxes = [];
    for (let tileIndex = 0; tileIndex < 3; tileIndex++) {
      const pixelMinX = tileIndex * this.tileWidth * dpr;
      const pixelMaxX = (tileIndex + 1) * this.tileWidth * dpr;
      this._pixelBoxes.push({
        min: new THREE.Vector2(pixelMinX, 0),
        max: new THREE.Vector2(pixelMaxX, this.contentHeight * dpr),
      });
      this._uvBoxes.push({
        min: new THREE.Vector2(tileIndex / 3, 0),
        max: new THREE.Vector2((tileIndex + 1) / 3, 1),
      });
    }

    const drawTile = (tileIndex: number, blur: number) => {
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.translate(tileIndex * this.tileWidth, 0);
      ctx.filter = blur > 0 ? `blur(${blur}px)` : "none";
      ctx.font = `100 ${fontSize}px "${this._fontFamily}"`;
      ctx.fillStyle = "#000";
      ctx.textBaseline = "top";
      let y = TILE_PADDING;
      sections.forEach((lines, si) => {
        if (tileIndex === 0) {
          this.sectionRanges[si].min = (y - TILE_PADDING) / (this.contentHeight - TILE_PADDING * 2);
        }
        lines.forEach((line) => {
          if (line) ctx.fillText(line, TILE_PADDING, y);
          y += lineHeight;
        });
        if (tileIndex === 0) {
          this.sectionRanges[si].max = (y - TILE_PADDING) / (this.contentHeight - TILE_PADDING * 2);
        }
        y += lineHeight; // 节间距
      });
      ctx.restore();
    };

    drawTile(0, 0);
    drawTile(1, 2);
    drawTile(2, 6);

    this._imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.flipY = false;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
  }

  /** 读取与原始 TextCanvas.fetchImageDataAtUv 等价的单像素数据。 */
  fetchImageDataAtUv(uv: THREE.Vector2): ImageData {
    if (!this._ctx || !this._canvas || !this._imageData) {
      return new ImageData(1, 1);
    }
    const x = THREE.MathUtils.clamp(Math.round(uv.x * this._canvas.width), 0, this._canvas.width - 1);
    const y = THREE.MathUtils.clamp(Math.round(uv.y * this._canvas.height), 0, this._canvas.height - 1);
    return this._ctx.getImageData(x, y, 1, 1);
  }

  /**
   * 命中检测：四边形内 uv（0~1）+ 当前滚动进度 → 是否落在文字笔画上。
   * 对应原站 checkTextIntersection 的 UV 换算 + alpha 读取。
   */
  hitTest(uv: { x: number; y: number }, scrollProgress: number, windowHeight: number): boolean {
    if (!this._imageData || !this._canvas) return false;
    if (uv.x < 0 || uv.x > 1 || uv.y < 0 || uv.y > 1) return false;
    const su = uv.x / 3; // 清晰瓦片
    const sv = (1 - uv.y) * windowHeight + scrollProgress * (1 - windowHeight);
    const px = Math.floor(su * this._canvas.width);
    const py = Math.floor(sv * this._canvas.height);
    if (px < 0 || px >= this._canvas.width || py < 0 || py >= this._canvas.height) return false;
    const alpha = this._imageData.data[(py * this._canvas.width + px) * 4 + 3];
    return alpha > 128;
  }

  resize(): void {
    const mobile = window.innerWidth < 768;
    if (mobile === this._mobile) return;
    this.texture?.dispose();
    this._render();
  }

  destroy(): void {
    this.texture?.dispose();
  }
}
