-- ============================================================
-- PULSE CHAT — Database Setup
-- Execute este SQL no Supabase SQL Editor:
-- Dashboard → SQL Editor → New Query → Cole e execute
-- ============================================================

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nickname VARCHAR(20) NOT NULL,
    content TEXT NOT NULL CHECK (char_length(content) <= 500),
    avatar_color VARCHAR(20) DEFAULT '#7C3AED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: qualquer um pode ler mensagens
CREATE POLICY "Anyone can read messages"
    ON messages FOR SELECT
    USING (true);

-- Policy: qualquer um pode inserir mensagens
CREATE POLICY "Anyone can insert messages"
    ON messages FOR INSERT
    WITH CHECK (true);

-- Habilitar Realtime para a tabela
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Index para performance nas queries ordenadas por data
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at DESC);
