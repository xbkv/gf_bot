import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { join } from "path";

const cardWidth = 1533 / 10;
const cardHeight = 2048 / 10;
const cardLabelHeight = 30;
const margin = 10;
const margin2 = 5;

const playerNameHeight = 40;
const selectedRowWidth = cardWidth * 2.5;
const selectedRowHeight = 80;
const totalAttackPowerHeight = 40;

const canvasWidth = (cardWidth + margin2) * 6 - margin2;
const canvasHeight =
  playerNameHeight +
  selectedRowHeight * 4 +
  totalAttackPowerHeight +
  margin +
  (cardHeight + cardLabelHeight) * 2;

const unknownIconImage = await loadImage(join("assets", "unknown_icon.png"));
const unknownCardImage = await loadImage(join("assets", "unknown_card.png"));
const leftArrowImage = await loadImage(join("assets", "left_arrow.png"));
const rightArrowImage = await loadImage(join("assets", "right_arrow.png"));
GlobalFonts.loadFontsFromDir("assets");

const typeNameTable = {
  attack: "攻撃",
  yokoyari: "横槍",
  defense: "防御",
  heal: "回復",
  miracle: "奇跡",
  transaction: "取引",
  tool: "ツール",
};

export default async function renderStateImg(state, player) {
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#adefec";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const hands = state.hands[player];
  const selected = state.selected[player];
  const opponent = player === "p1" ? "p2" : "p1";
  const opponentHands = state.hands[opponent];
  const opponentSelected = state.selected[opponent];

  const isMyDefenseTurn =
    state.currentAction.target === player &&
    (state.currentAction.type === "defendSelecting" ||
    state.currentAction.type === "transactionDefendSelecting");

  await drawSelected(
    margin,
    "あなた",
    hands,
    selected,
    ctx,
    isMyDefenseTurn
  );

  const isOpponentDefenseTurn =
    state.currentAction.target !== player &&
    (state.currentAction.type === "defendSelecting" ||
    state.currentAction.type === "transactionDefendSelecting");

  await drawSelected(
    margin + selectedRowWidth + margin,
    "相手",
    opponentHands,
    opponentSelected,
    ctx,
    isOpponentDefenseTurn
  );

  await drawHands(hands, selected, ctx);
  drawArrow(state, player, ctx);

  return canvas.encodeSync("webp", 80);
}

// 選択中のカードを描画
async function drawSelected(leftOffset, label, hands, selected, ctx, isDefenseTurn) {
  
  const firstCard = selected.length > 0 ? hands[selected[0]] : null;

  ctx.font = "600 30px 'IBM Plex Sans JP'";
  ctx.textAlign = "center";
  ctx.fillStyle = "#4f4f4f";
  ctx.fillText(label, leftOffset + selectedRowWidth / 2, playerNameHeight / 2 + 5);

  const adjustedRowWidth = selectedRowWidth * 0.88;

  ctx.save();
  ctx.beginPath();
  ctx.rect(leftOffset, playerNameHeight, adjustedRowWidth, selectedRowHeight * 4);
  ctx.clip();

  let i = 0;
  let totalPower = 0;
  let hasUnknownPower = false;

  for (const idx of selected) {
    const card = hands[idx];
    const image = await loadImage(card.iconUrl).catch(() => unknownIconImage);

    const value = isDefenseTurn ? card.defensePower : card.attackPower;
    if (value === "?") {
      hasUnknownPower = true;
    } else {
      totalPower += value ?? 0;
    }

    const x = leftOffset;
    const y = playerNameHeight + selectedRowHeight * i;

    // 背景
    ctx.fillStyle = "#ddffcc";
    ctx.strokeStyle = "#91b993";
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, adjustedRowWidth, selectedRowHeight);
    ctx.strokeRect(x + 1, y + 1, adjustedRowWidth - 2, selectedRowHeight - 2);

    // アイコン
    const iconSize = selectedRowHeight - 20;
    ctx.drawImage(image, x + 8, y + 10, iconSize, iconSize);

    // 名前ボックス
    const nameBoxX = x + iconSize + 15;
    const nameBoxWidth = adjustedRowWidth - iconSize - 30;
    ctx.strokeStyle = "#91b993";
    ctx.strokeRect(nameBoxX, y + 10, nameBoxWidth, 25);

    // 名前
    ctx.font = "600 18px 'IBM Plex Sans JP'";
    ctx.fillStyle = "#4f4f4f";
    ctx.textAlign = "left";
    ctx.fillText(card.name, nameBoxX + 6, y + 28);

    // パラメータ表示
    ctx.font = "600 20px 'IBM Plex Sans JP'";
    let statLabel = "";
    if (card.type === "attack") {
      statLabel = `攻${card.attackPower}`;
    } else if (card.type === "yokoyari") {
      statLabel = `+攻${card.attackPower}`;
    } else if (card.type === "defense") {
      statLabel = `守${card.defensePower ?? card.attackPower}`;
    } else if (card.type === "heal") {
      statLabel = `回復${card.attackPower}`;
    } else if (card.type === "miracle") {
      statLabel = `消費MP: ${card.attackPower}`;
    } else if (card.type === "both") {
      if (isDefenseTurn) {
        statLabel = `守${card.defensePower ?? 0}`;
      } else {
        statLabel = `攻${card.attackPower}`;
      }
    }

    if (statLabel) {
      ctx.fillText(statLabel, nameBoxX + 6, y + 55);
    }

    // 円形価格ラベル
    if (card.price !== undefined) {
      const r = 18;
      const cx = x + adjustedRowWidth - r - 6;
      const cy = y + selectedRowHeight - r - 6;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = "#ffee88";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#ccbb44";
      ctx.stroke();

      ctx.font = "600 16px 'IBM Plex Sans JP'";
      ctx.fillStyle = "#8b4f00";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`¥${card.price}`, cx, cy);
    }

    i++;
  }

  ctx.restore();

  // 合計表示欄
  ctx.fillStyle = "#ddffcc";
  ctx.strokeStyle = "#91b993";
  ctx.fillRect(
    leftOffset,
    playerNameHeight + selectedRowHeight * 4,
    adjustedRowWidth,
    totalAttackPowerHeight
  );

  // 合計表示欄の描画は常に行う
ctx.fillStyle = "#ddffcc";
ctx.strokeStyle = "#91b993";
ctx.fillRect(
  leftOffset,
  playerNameHeight + selectedRowHeight * 4,
  adjustedRowWidth,
  totalAttackPowerHeight
);

  // 合計テキストはカードが選ばれているときだけ描画
  if (firstCard) {
    ctx.font = "600 30px 'IBM Plex Sans JP'";
    ctx.textAlign = "center";
    ctx.fillStyle = "#4f4f4f";

    let totalLabel;
    if (firstCard.type === "both") {
      totalLabel = isDefenseTurn ? "防御: " : "攻撃: ";
    } else if (isDefenseTurn) {
      totalLabel = "防御: ";
    } else if (firstCard.type === "attack" || firstCard.type === "yokoyari") {
      totalLabel = "攻撃: ";
    } else if (firstCard.type === "heal") {
      totalLabel = "回復: ";
    } else if (firstCard.type === "miracle") {
      totalLabel = "消費MP: ";
    }

    if (totalLabel) {
      ctx.fillText(
        `${totalLabel}${totalPower}${hasUnknownPower ? "+?" : ""}`,
        leftOffset + adjustedRowWidth / 2,
        playerNameHeight + selectedRowHeight * 4 + totalAttackPowerHeight / 2 + 10
      );
    }
  }
}

// 自身の手札を描画
async function drawHands(hands, selected, ctx) {
  let i = 0;
  for (const card of hands) {
    if (i >= 10) break;

    const image = await loadImage(card.path).catch(() => unknownCardImage);

    const squareSize = cardWidth;
    const itemsPerRow = 5;
    const x = margin + (squareSize + 5) * (i % itemsPerRow);
    const y =
      canvasHeight - (squareSize + cardLabelHeight + 30) * 2 + // 30px 余白を考慮
      (squareSize + cardLabelHeight + 30) * Math.floor(i / itemsPerRow);

    // 手札の番号ラベル
    ctx.fillStyle = selected.includes(i) ? "#808080" : "#008f6f";
    ctx.fillRect(x, y, squareSize, cardLabelHeight);
    ctx.font = "400 30px 'IBM Plex Sans JP'";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.fillText((i + 1).toString(), x + squareSize / 2, y + cardLabelHeight - 5, squareSize);

    // カード画像
    ctx.drawImage(image, x, y + cardLabelHeight, squareSize, squareSize);

    // 攻撃力・防御力のラベル（画像の下に描画）
    let statLabel = "";

    if (card.type !== "transaction") {
      if (card.attackPower !== undefined && card.defensePower !== undefined) {
        statLabel = `攻${card.attackPower} / 守${card.defensePower}`;
      } else if (card.type === "yokoyari" && card.attackPower !== undefined) {
        statLabel = `+攻${card.attackPower}`;
      } else if (card.attackPower !== undefined) {
        statLabel = `攻${card.attackPower}`;
      } else if (card.defensePower !== undefined) {
        statLabel = `守${card.defensePower}`;
      }
    }

      if (statLabel) {
      const statBgHeight = 26;
      const statBgY = y + cardLabelHeight + squareSize + 4;

      // 背景色（明るい黄色）
      ctx.fillStyle = "#f8f8cc";
      ctx.fillRect(x, statBgY, squareSize, statBgHeight);

      // テキスト
      ctx.font = "bold 20px 'IBM Plex Sans JP'";
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.fillText(
        statLabel,
        x + squareSize / 2,
        statBgY + 20
      );
    }

    i++;
  }
}

// 攻撃方向を表現する矢印を描画
function drawArrow(state, player, ctx) {
  const { currentAction } = state;
  const selected = state.selected[player];
  const hands = state.hands[player];

  let arrowImage;
  if (currentAction.type === "attackSelecting") {
    if (currentAction.target === player) {
      if (hands[selected[0]]?.type === "heal") arrowImage = leftArrowImage;
      else if (hands[selected[0]]?.name === "両替") arrowImage = leftArrowImage;
      else arrowImage = rightArrowImage;
    } else {
      arrowImage = leftArrowImage;
    }
  } else if (
    currentAction.type === "defendSelecting" ||
    currentAction.type === "transactionDefendSelecting"
  ) {
    arrowImage = currentAction.target === player ? leftArrowImage : rightArrowImage;
  } else if (currentAction.type === "buyConfirming") {
    arrowImage = currentAction.target === player ? leftArrowImage : rightArrowImage;
  } else if (currentAction.type === "miracleConfirming") {
    arrowImage = currentAction.target === player ? rightArrowImage : leftArrowImage;
  } else if (currentAction.type === "exchangeEntering") {
    arrowImage = currentAction.target === player ? leftArrowImage : rightArrowImage;
  }

  // 新しい位置：プレート下の中央
  const arrowSize = 50;
  const arrowX = margin + selectedRowWidth + margin / 2 - arrowSize / 2;
  const arrowY = 0; // プレートのY（20） + 高さ（36）+ 余白（5）

  ctx.drawImage(arrowImage, arrowX, arrowY, arrowSize, arrowSize);
}
