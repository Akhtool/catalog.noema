-- Миграция: WhatsApp по способу получения заказа
-- Дата: 2026-02-07
-- Описание: Добавляет поля whatsapp_delivery, whatsapp_pickup, whatsapp_dine_in в business.
--           При оформлении заказа используется номер по способу (доставка/самовывоз/в зале),
--           если не задан — fallback на основной whatsapp.

ALTER TABLE business
ADD COLUMN IF NOT EXISTS whatsapp_delivery TEXT;

ALTER TABLE business
ADD COLUMN IF NOT EXISTS whatsapp_pickup TEXT;

ALTER TABLE business
ADD COLUMN IF NOT EXISTS whatsapp_dine_in TEXT;

COMMENT ON COLUMN business.whatsapp_delivery IS 'WhatsApp для заказов с доставкой; если null — используется whatsapp';
COMMENT ON COLUMN business.whatsapp_pickup IS 'WhatsApp для самовывоза; если null — используется whatsapp';
COMMENT ON COLUMN business.whatsapp_dine_in IS 'WhatsApp для заказа в зале; если null — используется whatsapp';
