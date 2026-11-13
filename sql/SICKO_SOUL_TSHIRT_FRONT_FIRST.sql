-- SICKO SOUL: Correct front-of-T-shirt default images for existing 8-product import.
-- For MySQL Workbench. NO SCHEMA MIGRATION, NO STOCK OR PRICE CHANGES.
-- Changes only image_type, sort_order, alt_text on the original 48 imported images.
-- Run ONCE after backing up your local database. Safe to re-run (same results).
-- The *_F_* URL is the garment-only front photo; *_front_* is the model photo.
-- This makes the garment front the first image, while preserving all hover frames.

START TRANSACTION;

UPDATE product_images AS img
JOIN products AS p ON p.product_id = img.product_id
SET
  img.image_type = CASE img.image_url
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394880/warrior_front_t9i7fe.png' THEN 'WORN'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394875/warrior_back_fmfcf1.png' THEN 'GALLERY'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394868/warrior_F_lbk5nz.png' THEN 'STILL'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394859/warrior_B_v7rsou.png' THEN 'GALLERY'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394831/ninja_black_front_tyakmh.png' THEN 'WORN'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394827/ninja_black_back_kcp3iv.png' THEN 'GALLERY'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394840/ninja_black_F_bqktj6.png' THEN 'STILL'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394815/ninja_black_B_ipsaf9.png' THEN 'GALLERY'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394840/ninja_white_front_lac1cl.png' THEN 'WORN'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394844/ninja_white_back_ydxmcv.png' THEN 'GALLERY'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394843/ninja_white_F_yl70eg.png' THEN 'STILL'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394841/ninja_white_B_abi0ka.png' THEN 'GALLERY'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394795/iceman_black_front_edgx06.png' THEN 'WORN'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394796/iceman_black_back_x1lpoy.png' THEN 'GALLERY'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394790/iceman_black_F_bio2go.png' THEN 'STILL'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394816/iceman_black_B_fd5w0f.png' THEN 'GALLERY'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394826/iceman_white_front_vlj3t0.png' THEN 'WORN'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394817/iceman_white_back_siu1yv.png' THEN 'GALLERY'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394813/iceman_white_F_rctbss.png' THEN 'STILL'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394801/iceman_white_B_scmitn.png' THEN 'GALLERY'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394789/horse_game_black_front_2_fvfkpj.png' THEN 'WORN'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394772/horse_game_black_back_1_dvwebt.png' THEN 'GALLERY'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394772/horse_game_black_F_nqxqsg.png' THEN 'STILL'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394777/horse_game_black_B_xcixle.png' THEN 'GALLERY'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394852/sicko_bird_black_front_adjnvn.png' THEN 'WORN'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394860/sicko_bird_black_back_u9myyv.png' THEN 'GALLERY'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394868/sicko_bird_black_F_aeahai.png' THEN 'STILL'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394851/sicko_bird_black_B_n8l9f7.png' THEN 'GALLERY'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394867/sicko_bird_white_front_ijqnr6.png' THEN 'WORN'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394860/sicko_bird_white_back_y3rgxl.png' THEN 'GALLERY'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394855/sicko_bird_white_F_owfewe.png' THEN 'STILL'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394856/sicko_bird_white_B_ysxrj6.png' THEN 'GALLERY'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394668/return_black_front_qn4tz2.png' THEN 'WORN'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394670/return_black_back_gkj3wx.png' THEN 'GALLERY'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394672/return_black_F_v5a0ck.png' THEN 'STILL'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394762/return_black_B_kdz9wf.png' THEN 'GALLERY'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394589/dinosoul_black_front_qum6xr.png' THEN 'WORN'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394575/dinosoul_black_back_swiv0d.png' THEN 'GALLERY'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394567/dinosoul_black_F_gvio4q.png' THEN 'STILL'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394553/dinosoul_black_B_zdmsri.png' THEN 'GALLERY'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394591/dinosoul_white_front_zn7yqg.png' THEN 'WORN'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794398288/dinosoul_white_back_dgekuf.png' THEN 'GALLERY'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394627/dinosoul_white_F_beo4cx.png' THEN 'STILL'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394621/dinosoul_white_B_g2dx8e.png' THEN 'GALLERY'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394773/gods_plan_black_front_lysfiu.png' THEN 'WORN'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394764/gods_plan_black_back_kaiidv.png' THEN 'GALLERY'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394773/gods_plan_black_F_r3thm7.png' THEN 'STILL'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394769/gods_plan_black_B_o7jif4.png' THEN 'GALLERY'
    ELSE img.image_type END,
  img.sort_order = CASE img.image_url
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394880/warrior_front_t9i7fe.png' THEN 20
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394875/warrior_back_fmfcf1.png' THEN 30
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394868/warrior_F_lbk5nz.png' THEN 0
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394859/warrior_B_v7rsou.png' THEN 10
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394831/ninja_black_front_tyakmh.png' THEN 20
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394827/ninja_black_back_kcp3iv.png' THEN 30
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394840/ninja_black_F_bqktj6.png' THEN 0
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394815/ninja_black_B_ipsaf9.png' THEN 10
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394840/ninja_white_front_lac1cl.png' THEN 20
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394844/ninja_white_back_ydxmcv.png' THEN 30
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394843/ninja_white_F_yl70eg.png' THEN 0
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394841/ninja_white_B_abi0ka.png' THEN 10
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394795/iceman_black_front_edgx06.png' THEN 20
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394796/iceman_black_back_x1lpoy.png' THEN 30
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394790/iceman_black_F_bio2go.png' THEN 0
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394816/iceman_black_B_fd5w0f.png' THEN 10
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394826/iceman_white_front_vlj3t0.png' THEN 20
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394817/iceman_white_back_siu1yv.png' THEN 30
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394813/iceman_white_F_rctbss.png' THEN 0
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394801/iceman_white_B_scmitn.png' THEN 10
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394789/horse_game_black_front_2_fvfkpj.png' THEN 20
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394772/horse_game_black_back_1_dvwebt.png' THEN 30
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394772/horse_game_black_F_nqxqsg.png' THEN 0
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394777/horse_game_black_B_xcixle.png' THEN 10
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394852/sicko_bird_black_front_adjnvn.png' THEN 20
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394860/sicko_bird_black_back_u9myyv.png' THEN 30
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394868/sicko_bird_black_F_aeahai.png' THEN 0
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394851/sicko_bird_black_B_n8l9f7.png' THEN 10
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394867/sicko_bird_white_front_ijqnr6.png' THEN 20
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394860/sicko_bird_white_back_y3rgxl.png' THEN 30
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394855/sicko_bird_white_F_owfewe.png' THEN 0
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394856/sicko_bird_white_B_ysxrj6.png' THEN 10
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394668/return_black_front_qn4tz2.png' THEN 20
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394670/return_black_back_gkj3wx.png' THEN 30
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394672/return_black_F_v5a0ck.png' THEN 0
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394762/return_black_B_kdz9wf.png' THEN 10
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394589/dinosoul_black_front_qum6xr.png' THEN 20
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394575/dinosoul_black_back_swiv0d.png' THEN 30
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394567/dinosoul_black_F_gvio4q.png' THEN 0
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394553/dinosoul_black_B_zdmsri.png' THEN 10
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394591/dinosoul_white_front_zn7yqg.png' THEN 20
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794398288/dinosoul_white_back_dgekuf.png' THEN 30
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394627/dinosoul_white_F_beo4cx.png' THEN 0
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394621/dinosoul_white_B_g2dx8e.png' THEN 10
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394773/gods_plan_black_front_lysfiu.png' THEN 20
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394764/gods_plan_black_back_kaiidv.png' THEN 30
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394773/gods_plan_black_F_r3thm7.png' THEN 0
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394769/gods_plan_black_B_o7jif4.png' THEN 10
    ELSE img.sort_order END,
  img.alt_text = CASE img.image_url
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394880/warrior_front_t9i7fe.png' THEN 'Warrior / Black / Model front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394875/warrior_back_fmfcf1.png' THEN 'Warrior / Black / Model back'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394868/warrior_F_lbk5nz.png' THEN 'Warrior / Black / T-shirt front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394859/warrior_B_v7rsou.png' THEN 'Warrior / Black / T-shirt back'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394831/ninja_black_front_tyakmh.png' THEN 'Ninja / Black / Model front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394827/ninja_black_back_kcp3iv.png' THEN 'Ninja / Black / Model back'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394840/ninja_black_F_bqktj6.png' THEN 'Ninja / Black / T-shirt front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394815/ninja_black_B_ipsaf9.png' THEN 'Ninja / Black / T-shirt back'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394840/ninja_white_front_lac1cl.png' THEN 'Ninja / White / Model front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394844/ninja_white_back_ydxmcv.png' THEN 'Ninja / White / Model back'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394843/ninja_white_F_yl70eg.png' THEN 'Ninja / White / T-shirt front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394841/ninja_white_B_abi0ka.png' THEN 'Ninja / White / T-shirt back'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394795/iceman_black_front_edgx06.png' THEN 'Iceman / Black / Model front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394796/iceman_black_back_x1lpoy.png' THEN 'Iceman / Black / Model back'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394790/iceman_black_F_bio2go.png' THEN 'Iceman / Black / T-shirt front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394816/iceman_black_B_fd5w0f.png' THEN 'Iceman / Black / T-shirt back'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394826/iceman_white_front_vlj3t0.png' THEN 'Iceman / White / Model front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394817/iceman_white_back_siu1yv.png' THEN 'Iceman / White / Model back'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394813/iceman_white_F_rctbss.png' THEN 'Iceman / White / T-shirt front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394801/iceman_white_B_scmitn.png' THEN 'Iceman / White / T-shirt back'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394789/horse_game_black_front_2_fvfkpj.png' THEN 'Horse Game / Black / Model front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394772/horse_game_black_back_1_dvwebt.png' THEN 'Horse Game / Black / Model back'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394772/horse_game_black_F_nqxqsg.png' THEN 'Horse Game / Black / T-shirt front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394777/horse_game_black_B_xcixle.png' THEN 'Horse Game / Black / T-shirt back'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394852/sicko_bird_black_front_adjnvn.png' THEN 'Sicko Bird / Black / Model front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394860/sicko_bird_black_back_u9myyv.png' THEN 'Sicko Bird / Black / Model back'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394868/sicko_bird_black_F_aeahai.png' THEN 'Sicko Bird / Black / T-shirt front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394851/sicko_bird_black_B_n8l9f7.png' THEN 'Sicko Bird / Black / T-shirt back'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394867/sicko_bird_white_front_ijqnr6.png' THEN 'Sicko Bird / White / Model front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394860/sicko_bird_white_back_y3rgxl.png' THEN 'Sicko Bird / White / Model back'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394855/sicko_bird_white_F_owfewe.png' THEN 'Sicko Bird / White / T-shirt front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394856/sicko_bird_white_B_ysxrj6.png' THEN 'Sicko Bird / White / T-shirt back'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394668/return_black_front_qn4tz2.png' THEN 'Return / Black / Model front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394670/return_black_back_gkj3wx.png' THEN 'Return / Black / Model back'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394672/return_black_F_v5a0ck.png' THEN 'Return / Black / T-shirt front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394762/return_black_B_kdz9wf.png' THEN 'Return / Black / T-shirt back'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394589/dinosoul_black_front_qum6xr.png' THEN 'DinoSoul / Black / Model front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394575/dinosoul_black_back_swiv0d.png' THEN 'DinoSoul / Black / Model back'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394567/dinosoul_black_F_gvio4q.png' THEN 'DinoSoul / Black / T-shirt front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394553/dinosoul_black_B_zdmsri.png' THEN 'DinoSoul / Black / T-shirt back'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394591/dinosoul_white_front_zn7yqg.png' THEN 'DinoSoul / White / Model front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794398288/dinosoul_white_back_dgekuf.png' THEN 'DinoSoul / White / Model back'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394627/dinosoul_white_F_beo4cx.png' THEN 'DinoSoul / White / T-shirt front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394621/dinosoul_white_B_g2dx8e.png' THEN 'DinoSoul / White / T-shirt back'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394773/gods_plan_black_front_lysfiu.png' THEN 'Gods Plan / Black / Model front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394764/gods_plan_black_back_kaiidv.png' THEN 'Gods Plan / Black / Model back'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394773/gods_plan_black_F_r3thm7.png' THEN 'Gods Plan / Black / T-shirt front'
    WHEN 'https://res.cloudinary.com/dec82taov/image/upload/v1794394769/gods_plan_black_B_o7jif4.png' THEN 'Gods Plan / Black / T-shirt back'
    ELSE img.alt_text END
WHERE p.public_id LIKE 'SS-REAL-%'
  AND img.image_url IN (
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394880/warrior_front_t9i7fe.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394875/warrior_back_fmfcf1.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394868/warrior_F_lbk5nz.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394859/warrior_B_v7rsou.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394831/ninja_black_front_tyakmh.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394827/ninja_black_back_kcp3iv.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394840/ninja_black_F_bqktj6.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394815/ninja_black_B_ipsaf9.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394840/ninja_white_front_lac1cl.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394844/ninja_white_back_ydxmcv.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394843/ninja_white_F_yl70eg.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394841/ninja_white_B_abi0ka.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394795/iceman_black_front_edgx06.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394796/iceman_black_back_x1lpoy.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394790/iceman_black_F_bio2go.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394816/iceman_black_B_fd5w0f.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394826/iceman_white_front_vlj3t0.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394817/iceman_white_back_siu1yv.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394813/iceman_white_F_rctbss.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394801/iceman_white_B_scmitn.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394789/horse_game_black_front_2_fvfkpj.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394772/horse_game_black_back_1_dvwebt.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394772/horse_game_black_F_nqxqsg.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394777/horse_game_black_B_xcixle.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394852/sicko_bird_black_front_adjnvn.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394860/sicko_bird_black_back_u9myyv.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394868/sicko_bird_black_F_aeahai.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394851/sicko_bird_black_B_n8l9f7.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394867/sicko_bird_white_front_ijqnr6.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394860/sicko_bird_white_back_y3rgxl.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394855/sicko_bird_white_F_owfewe.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394856/sicko_bird_white_B_ysxrj6.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394668/return_black_front_qn4tz2.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394670/return_black_back_gkj3wx.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394672/return_black_F_v5a0ck.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394762/return_black_B_kdz9wf.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394589/dinosoul_black_front_qum6xr.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394575/dinosoul_black_back_swiv0d.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394567/dinosoul_black_F_gvio4q.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394553/dinosoul_black_B_zdmsri.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394591/dinosoul_white_front_zn7yqg.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794398288/dinosoul_white_back_dgekuf.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394627/dinosoul_white_F_beo4cx.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394621/dinosoul_white_B_g2dx8e.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394773/gods_plan_black_front_lysfiu.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394764/gods_plan_black_back_kaiidv.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394773/gods_plan_black_F_r3thm7.png',
    'https://res.cloudinary.com/dec82taov/image/upload/v1794394769/gods_plan_black_B_o7jif4.png'
  );

COMMIT;

-- Verify: the first photo for each product/colour must be STILL (garment front).
SELECT p.name AS product, img.color_code, img.image_type, img.sort_order,
       SUBSTRING_INDEX(img.image_url, '/', -1) AS image_filename
FROM product_images img
JOIN products p ON p.product_id = img.product_id
WHERE p.public_id LIKE 'SS-REAL-%'
ORDER BY p.name, img.color_code, img.sort_order;
