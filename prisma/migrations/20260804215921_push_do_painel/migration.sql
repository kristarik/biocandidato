-- AlterTable
ALTER TABLE `push_tokens` ADD COLUMN `user_id` CHAR(36) NULL,
    MODIFY `supporter_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `push_tokens_user_id_idx` ON `push_tokens`(`user_id`);

-- AddForeignKey
ALTER TABLE `push_tokens` ADD CONSTRAINT `push_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
