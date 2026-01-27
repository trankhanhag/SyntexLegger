/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex('db_schema_metadata').del();

  // Insert initial metadata
  await knex('db_schema_metadata').insert([
    {
      table_name: 'vouchers',
      friendly_name: 'Chứng từ Chung',
      description: 'Bảng chứa thông tin chung của phiếu thu, chi, nhập, xuất...',
      common_aliases: JSON.stringify(['chứng từ', 'phiếu', 'voucher', 'document']),
      key_columns: JSON.stringify(['id', 'doc_no', 'doc_date', 'description']),
      priority: 100
    },
    {
      table_name: 'voucher_items',
      friendly_name: 'Chi tiết Chứng từ',
      description: 'Dòng chi tiết hạch toán nợ có',
      common_aliases: JSON.stringify(['chi tiết', 'dòng', 'hạch toán', 'định khoản']),
      key_columns: JSON.stringify(['id', 'description', 'debit_account', 'credit_account', 'amount']),
      priority: 90
    },
    {
      table_name: 'chart_of_accounts',
      friendly_name: 'Hệ thống Tài khoản',
      description: 'Danh mục tài khoản kế toán',
      common_aliases: JSON.stringify(['tài khoản', 'tk', 'account']),
      key_columns: JSON.stringify(['account_code', 'account_name']),
      priority: 80
    },
    {
      table_name: 'partners',
      friendly_name: 'Đối tượng/Đối tác',
      description: 'Khách hàng, nhà cung cấp, nhân viên',
      common_aliases: JSON.stringify(['đối tượng', 'khách hàng', 'nhà cung cấp', 'người nộp', 'người nhận']),
      key_columns: JSON.stringify(['partner_code', 'partner_name', 'tax_code']),
      priority: 85
    },
    {
      table_name: 'products',
      friendly_name: 'Vật tư/Sản phẩm',
      description: 'Danh mục hàng hóa, vật tư',
      common_aliases: JSON.stringify(['vật tư', 'hàng hóa', 'sản phẩm', 'công cụ']),
      key_columns: JSON.stringify(['product_code', 'product_name', 'unit']),
      priority: 70
    },
    {
      table_name: 'projects',
      friendly_name: 'Dự án',
      description: 'Danh mục chương trình, dự án',
      common_aliases: JSON.stringify(['dự án', 'ctmt', 'chương trình']),
      key_columns: JSON.stringify(['project_code', 'project_name']),
      priority: 60
    },
    {
      table_name: 'contracts',
      friendly_name: 'Hợp đồng',
      description: 'Danh mục hợp đồng kinh tế',
      common_aliases: JSON.stringify(['hợp đồng', 'hđ']),
      key_columns: JSON.stringify(['contract_code', 'contract_name']),
      priority: 60
    },
    {
      table_name: 'budget_items',
      friendly_name: 'Mục lục Ngân sách',
      description: 'Mục, tiểu mục, chương, khoản',
      common_aliases: JSON.stringify(['mlns', 'mục', 'tiểu mục']),
      key_columns: JSON.stringify(['item_code', 'sub_item_code', 'name']),
      priority: 75
    },
    {
      table_name: 'fund_sources',
      friendly_name: 'Nguồn kinh phí',
      description: 'Danh mục nguồn vốn, nguồn kinh phí',
      common_aliases: JSON.stringify(['nguồn', 'nguồn vốn']),
      key_columns: JSON.stringify(['fund_code', 'fund_name']),
      priority: 75
    }
  ]);
};
