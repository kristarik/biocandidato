-- O SQL gerado adicionava `username` como NOT NULL de uma vez, o que daria
-- string vazia em toda linha existente e faria o indice unico falhar. A coluna
-- entra nula, os usuarios atuais herdam a parte do email antes do @ (que ja e
-- unica e legivel), e so entao a restricao e aplicada.

-- AlterTable
ALTER TABLE `users` ADD COLUMN `username` VARCHAR(60) NULL,
    MODIFY `email` VARCHAR(180) NULL;

-- Backfill: dra-maria@candidato.bio -> dra-maria
UPDATE `users` SET `username` = SUBSTRING_INDEX(`email`, '@', 1) WHERE `username` IS NULL;

-- Rede de seguranca: se algum usuario estivesse sem email, herda o id.
UPDATE `users` SET `username` = LEFT(`id`, 12) WHERE `username` IS NULL OR `username` = '';

-- AlterTable
ALTER TABLE `users` MODIFY `username` VARCHAR(60) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_username_key` ON `users`(`username`);
