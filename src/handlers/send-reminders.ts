import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

function getParticipants(session: Ctx["session"]) {
  return session.participants ?? {};
}

const composer = new Composer<Ctx>();

// Manual reminder command — admin only
composer.command("send_reminders", async (ctx) => {
  const participants = getParticipants(ctx.session);
  const registered = Object.values(participants).filter((p) => p.status === "registered");

  if (registered.length === 0) {
    await ctx.reply(
      "No registered participants yet.\n\n" +
      "Share the bot link to let people sign up.",
    );
    return;
  }

  let sent = 0;
  let failed = 0;

  for (const p of registered) {
    try {
      await ctx.api.sendMessage(
        p.telegram_id,
        "Reminder: The webinar starts soon! 📅\n\n" +
        "Make sure you're ready — we'll see you there.",
      );
      sent++;
    } catch {
      // User may have blocked the bot — skip silently
      failed++;
    }
  }

  const summary = [
    `Reminders sent: ${sent}`,
    failed > 0 ? `Failed: ${failed} (user may have blocked the bot)` : "",
  ].filter(Boolean).join("\n");

  await ctx.reply(summary, {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

// Also handle callback from admin menu button (for completeness)
composer.callbackQuery("admin:reminders", async (ctx) => {
  await ctx.answerCallbackQuery();
  const participants = getParticipants(ctx.session);
  const registered = Object.values(participants).filter((p) => p.status === "registered");

  if (registered.length === 0) {
    await ctx.editMessageText(
      "No registered participants yet.\n\n" +
      "Share the bot link to let people sign up.",
      { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]) },
    );
    return;
  }

  let sent = 0;
  let failed = 0;

  for (const p of registered) {
    try {
      await ctx.api.sendMessage(
        p.telegram_id,
        "Reminder: The webinar starts soon! 📅\n\n" +
        "Make sure you're ready — we'll see you there.",
      );
      sent++;
    } catch {
      failed++;
    }
  }

  const summary = [
    `Reminders sent: ${sent}`,
    failed > 0 ? `Failed: ${failed} (user may have blocked the bot)` : "",
  ].filter(Boolean).join("\n");

  await ctx.editMessageText(summary, {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
