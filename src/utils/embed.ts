import { EmbedBuilder, Colors } from 'discord.js';

export const TIXORA_COLOR = 0x5865F2;

export function successEmbed(title: string, description?: string): EmbedBuilder {
  const e = new EmbedBuilder().setColor(Colors.Green).setTitle(title);
  if (description) e.setDescription(description);
  return e.setTimestamp();
}

export function errorEmbed(title: string, description?: string): EmbedBuilder {
  const e = new EmbedBuilder().setColor(Colors.Red).setTitle(title);
  if (description) e.setDescription(description);
  return e.setTimestamp();
}

export function warningEmbed(title: string, description?: string): EmbedBuilder {
  const e = new EmbedBuilder().setColor(Colors.Yellow).setTitle(title);
  if (description) e.setDescription(description);
  return e.setTimestamp();
}

export function infoEmbed(title: string, description?: string): EmbedBuilder {
  const e = new EmbedBuilder().setColor(TIXORA_COLOR).setTitle(title);
  if (description) e.setDescription(description);
  return e.setTimestamp();
}

export function ticketEmbed(options: {
  title: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: string;
}): EmbedBuilder {
  const e = new EmbedBuilder().setColor(options.color ?? TIXORA_COLOR).setTitle(options.title);
  if (options.description) e.setDescription(options.description);
  if (options.fields) e.addFields(options.fields);
  if (options.footer) e.setFooter({ text: options.footer });
  return e.setTimestamp();
}

export function hexToDecimal(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}
