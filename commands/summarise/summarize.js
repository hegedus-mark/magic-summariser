import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import OpenAI from 'openai';
import ms from 'ms';

const client = new OpenAI();

export const command = {
  data: new SlashCommandBuilder()
    .setName('summarize')
    .setDescription('Summarizes recent messages in the channel.')
    .addStringOption(option =>
      option.setName('timeframe')
        .setDescription('Timeframe to summarize (e.g., 10m, 1h, 2d)')
        .setRequired(true)),
  async execute(interaction) {

    if (interaction.user.id !== process.env.ALLOWED_USER_ID) {
      return interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true
      });
    }

    await interaction.deferReply();

    const timeframe = interaction.options.getString('timeframe');
    const duration = ms(timeframe);

    if (!duration) {
      await interaction.editReply('Invalid timeframe format. Please use formats like 10m, 1h, or 2d.');
      return;
    }

    const fetchAfter = Date.now() - duration;

    try {
      const messages = await interaction.channel.messages.fetch();
      const relevantMessages = messages.filter(m => m.createdTimestamp >= fetchAfter);

      if (relevantMessages.size === 0) {
        await interaction.editReply('No messages found in this timeframe.');
        return;
      }

      const content = relevantMessages.map(m => `${m.author.username}: ${m.content}`).join('\n');

      const response = await client.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'system', content: 'Summarize the following chat messages.' }, { role: 'user', content }],
      });

      const summary = response.choices[0].message.content.trim();

      console.log(`Here's the summary: ${summary}`)

      await interaction.editReply(`**Summary:**\n${summary}`);
    } catch (error) {
      console.error(error);
      await interaction.editReply('An error occurred while fetching or summarizing messages.');
    }
  },
};
