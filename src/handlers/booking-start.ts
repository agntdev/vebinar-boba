import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard, confirmKeyboard } from "../toolkit/index.js";

// Register the "Записаться" button in the /start main menu
registerMainMenuItem({ label: "📝 Записаться", data: "booking:start", order: 10 });

function getParticipants(session: Ctx["session"]) {
  return session.participants ?? {};
}

function setParticipants(session: Ctx["session"], data: NonNullable<Ctx["session"]["participants"]>) {
  session.participants = data;
}

const composer = new Composer<Ctx>();

// Start the registration flow
composer.callbackQuery("booking:start", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "awaiting_name";
  ctx.session.registration = undefined;
  await ctx.reply("Great! Let's register you for the webinar.\n\nWhat's your full name?", {
    reply_markup: { force_reply: true, input_field_placeholder: "First and last name" } as any,
  });
});

// Handle name input
composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_name") return next();
  const name = ctx.message.text.trim();
  if (name.length < 2) {
    await ctx.reply("Name looks too short — please enter your full name.");
    return;
  }
  ctx.session.registration = { name, email: "", phone: "" };
  ctx.session.step = "awaiting_email";
  await ctx.reply(`Nice to meet you, ${name}!\n\nWhat's your email address?`, {
    reply_markup: { force_reply: true, input_field_placeholder: "you@example.com" } as any,
  });
});

// Handle email input
composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_email") return next();
  const email = ctx.message.text.trim();
  if (!email.includes("@") || !email.includes(".")) {
    await ctx.reply("That doesn't look like a valid email — try again?");
    return;
  }
  if (!ctx.session.registration) {
    ctx.session.registration = { name: "", email: "", phone: "" };
  }
  ctx.session.registration.email = email;
  ctx.session.step = "awaiting_phone";
  await ctx.reply("Got it! Now, what's your phone number?", {
    reply_markup: { force_reply: true, input_field_placeholder: "+7 999 123 4567" } as any,
  });
});

// Handle phone input
composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_phone") return next();
  const phone = ctx.message.text.trim();
  if (phone.length < 6) {
    await ctx.reply("That phone number looks too short — try again?");
    return;
  }
  if (!ctx.session.registration) {
    ctx.session.registration = { name: "", email: "", phone: "" };
  }
  ctx.session.registration.phone = phone;
  ctx.session.step = "confirming";

  const { name, email } = ctx.session.registration;
  const confirmText = 
    `Please confirm your details:\n\n` +
    `Name: ${name}\n` +
    `Email: ${email}\n` +
    `Phone: ${phone}\n\n` +
    `Is everything correct?`;

  await ctx.reply(confirmText, {
    reply_markup: confirmKeyboard("booking:confirm", { yes: "✅ Confirm", no: "✏️ Edit" }),
  });
});

// Confirm registration
composer.callbackQuery("booking:confirm:yes", async (ctx) => {
  await ctx.answerCallbackQuery();
  const reg = ctx.session.registration;
  if (!reg) {
    await ctx.editMessageText("Something went wrong. Tap /start to try again.");
    ctx.session.step = "idle";
    return;
  }

  const chatId = String(ctx.from.id);
  const participants = getParticipants(ctx.session);
  participants[chatId] = {
    name: reg.name,
    email: reg.email,
    phone: reg.phone,
    telegram_id: ctx.from.id,
    status: "registered",
    registration_timestamp: Date.now(),
  };
  setParticipants(ctx.session, participants);
  ctx.session.step = "idle";
  ctx.session.registration = undefined;

  await ctx.editMessageText(
    "You're all set! 🎉\n\n" +
    "You're registered for the webinar. We'll send you a reminder before the event.\n\n" +
    "Tap the menu button below if you need anything else.",
    { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]) },
  );

  // Notify admin about new registration
  if (process.env.ADMIN_CHAT_ID) {
    const adminId = Number(process.env.ADMIN_CHAT_ID);
    try {
      await ctx.api.sendMessage(
        adminId,
        `📥 New registration!\n\n` +
        `Name: ${reg.name}\n` +
        `Email: ${reg.email}\n` +
        `Phone: ${reg.phone}\n` +
        `Telegram: @${ctx.from.username ?? ctx.from.id}`,
      );
    } catch {
      // Admin notification is best-effort
    }
  }
});

// Edit registration — go back to name
composer.callbackQuery("booking:confirm:no", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "awaiting_name";
  await ctx.editMessageText("No problem! Let's start over.\n\nWhat's your full name?", {
    reply_markup: { force_reply: true, input_field_placeholder: "First and last name" } as any,
  });
});

export default composer;
