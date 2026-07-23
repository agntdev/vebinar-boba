import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard, confirmKeyboard } from "../toolkit/index.js";

// Register the "Отменить запись" button in the /start main menu
registerMainMenuItem({ label: "❌ Отменить запись", data: "booking:cancel", order: 20 });

function getParticipants(session: Ctx["session"]) {
  return session.participants ?? {};
}

function setParticipants(session: Ctx["session"], data: NonNullable<Ctx["session"]["participants"]>) {
  session.participants = data;
}

const composer = new Composer<Ctx>();

// Start the cancellation flow
composer.callbackQuery("booking:cancel", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chatId = String(ctx.from.id);
  const participants = getParticipants(ctx.session);
  const participant = participants[chatId];

  if (!participant || participant.status !== "registered") {
    await ctx.reply(
      "You don't have an active registration yet.\n\n" +
      "Tap the button below to register for the webinar.",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("📝 Записаться", "booking:start")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
    return;
  }

  await ctx.reply(
    `You're registered as ${participant.name}.\n\n` +
    `Are you sure you want to cancel your registration?`,
    {
      reply_markup: confirmKeyboard("booking:cancel:confirm", {
        yes: "❌ Cancel registration",
        no: "⬅️ Keep registration",
      }),
    },
  );
});

// Confirm cancellation
composer.callbackQuery("booking:cancel:confirm:yes", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chatId = String(ctx.from.id);
  const participants = getParticipants(ctx.session);
  const participant = participants[chatId];

  if (!participant || participant.status !== "registered") {
    await ctx.editMessageText(
      "Something went wrong — your registration wasn't found.\n\nTap /start to see the menu.",
    );
    return;
  }

  participant.status = "cancelled";
  setParticipants(ctx.session, participants);

  await ctx.editMessageText(
    "Your registration has been cancelled.\n\n" +
    "If you change your mind, you can always register again.",
    {
      reply_markup: inlineKeyboard([
        [inlineButton("📝 Register again", "booking:start")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );

  // Notify admin about cancellation
  if (process.env.ADMIN_CHAT_ID) {
    const adminId = Number(process.env.ADMIN_CHAT_ID);
    try {
      await ctx.api.sendMessage(
        adminId,
        `📤 Registration cancelled!\n\n` +
        `Name: ${participant.name}\n` +
        `Email: ${participant.email}\n` +
        `Phone: ${participant.phone}\n` +
        `Telegram: @${ctx.from.username ?? ctx.from.id}`,
      );
    } catch {
      // Admin notification is best-effort
    }
  }
});

// Keep registration (cancel the cancellation)
composer.callbackQuery("booking:cancel:confirm:no", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    "No worries — your registration is safe! 🎉",
    {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    },
  );
});

export default composer;
