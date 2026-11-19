import pool from '../config/db.js';

export async function listPromotions(_req, res) {
  const [rows] = await pool.query(
    `SELECT code, description, discount_type AS discountType, discount_value AS discountValue,
      max_discount AS maxDiscount, min_order_amount AS minOrderAmount, end_date AS endDate
     FROM promotions WHERE is_active=1 AND start_date<=CURDATE() AND end_date>=CURDATE()
       AND (usage_limit IS NULL OR used_count<usage_limit) ORDER BY end_date`
  );
  res.json({ promotions: rows });
}
