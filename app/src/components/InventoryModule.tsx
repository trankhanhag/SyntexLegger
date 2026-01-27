import React, { useState, useEffect } from 'react';
import { SmartTable, type ColumnDef } from './SmartTable';
import { type RibbonAction } from './Ribbon';
import { FormModal } from './FormModal';
import { PrintPreviewModal } from './PrintTemplates';
import { settingsService } from '../api';
import { ModuleOverview } from './ModuleOverview';
import { MODULE_CONFIGS } from '../config/moduleConfigs';

/**
 * Inventory Module for HCSN
 * Quản lý Kho vật tư theo TT 24/2024/TT-BTC
 */

interface InventoryModuleProps {
    subView?: string;
    printSignal?: number;
    onSetHeader?: (header: { title: string; icon: string; actions?: RibbonAction[]; onDelete?: () => void }) => void;
    onNavigate?: (view: string) => void;
}

// ==================== HELPER COMPONENTS ====================

// Generic Editable Item Table
interface EditableItemTableProps {
    items: any[];
    setItems: (items: any[]) => void;
    materials: any[];
    type: 'RECEIPT' | 'ISSUE';
}

const EditableItemTable: React.FC<EditableItemTableProps> = ({ items, setItems, materials, type }) => {
    const handleAddItem = () => {
        setItems([...items, {
            material_id: '',
            quantity: 1,
            unit_price: 0,
            account_code: type === 'RECEIPT' ? '151' : '611',
            notes: ''
        }]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        const item = { ...newItems[index], [field]: value };

        // Auto-fill logic
        if (field === 'material_id') {
            const mat = materials.find(m => m.id === value);
            if (mat) {
                item.unit_price = mat.unit_price || 0;
                if (type === 'RECEIPT') {
                    item.account_code = mat.account_code || '151';
                }
                item._unit = mat.unit; // Temp display
                item._code = mat.code; // Temp display
            }
        }

        newItems[index] = item;
        setItems(newItems);
    };

    const grandTotal = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0);

    return (
        <div className="space-y-2">
            <div className="max-h-60 overflow-y-auto border rounded">
                <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-700 sticky top-0">
                        <tr>
                            <th className="p-2 text-left">Vật tư</th>
                            <th className="p-2 text-center w-20">SL</th>
                            <th className="p-2 text-right w-24">Đơn giá</th>
                            <th className="p-2 text-right w-28">Thành tiền</th>
                            <th className="p-2 text-center w-24">{type === 'RECEIPT' ? 'TK Nợ' : 'TK Chi phí'}</th>
                            <th className="p-2 text-center w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={idx} className="border-t">
                                <td className="p-1">
                                    <select
                                        className="w-full p-1 border rounded"
                                        value={item.material_id}
                                        onChange={e => {
                                            const val = e.target.value;
                                            const newItems = [...items];
                                            const mat = materials.find(m => m.id === val);
                                            const updatedItem = { ...newItems[idx], material_id: val };

                                            if (mat) {
                                                updatedItem.unit_price = mat.unit_price || 0;
                                                if (type === 'RECEIPT') {
                                                    updatedItem.account_code = mat.account_code || '151';
                                                } else {
                                                    // For ISSUE, we track the Asset Account (Credit) for the voucher
                                                    updatedItem.material_account_code = mat.account_code || '151';
                                                }
                                                // updatedItem._unit = mat.unit;
                                            }
                                            newItems[idx] = updatedItem;
                                            setItems(newItems);
                                        }}
                                    >
                                        <option value="">-- Chọn vật tư --</option>
                                        {materials.map(m => (
                                            <option key={m.id} value={m.id}>{m.code} - {m.name} ({m.unit})</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="p-1">
                                    <input
                                        type="number" className="w-full p-1 border rounded text-center"
                                        value={item.quantity}
                                        onChange={e => handleChange(idx, 'quantity', parseFloat(e.target.value))}
                                    />
                                </td>
                                <td className="p-1">
                                    <input
                                        type="number" className="w-full p-1 border rounded text-right"
                                        value={item.unit_price}
                                        onChange={e => handleChange(idx, 'unit_price', parseFloat(e.target.value))}
                                    />
                                </td>
                                <td className="p-2 text-right font-mono">
                                    {new Intl.NumberFormat('vi-VN').format((item.quantity || 0) * (item.unit_price || 0))}
                                </td>
                                <td className="p-1">
                                    {type === 'RECEIPT' ? (
                                        <input
                                            type="text" className="w-full p-1 border rounded text-center"
                                            value={item.account_code}
                                            onChange={e => handleChange(idx, 'account_code', e.target.value)}
                                        />
                                    ) : (
                                        <select
                                            className="w-full p-1 border rounded"
                                            value={item.expense_account_code}
                                            onChange={e => handleChange(idx, 'expense_account_code', e.target.value)}
                                        >
                                            <option value="611">611 - Hoạt động</option>
                                            <option value="612">612 - Viện trợ</option>
                                            <option value="613">613 - Mua sắm</option>
                                        </select>
                                    )}
                                </td>
                                <td className="p-1 text-center">
                                    <button onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700">
                                        <span className="material-icons text-sm">delete</span>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                <button onClick={handleAddItem} className="text-blue-600 font-bold text-sm flex items-center">
                    <span className="material-icons text-sm mr-1">add</span> Thêm dòng
                </button>
                <div className="font-bold">
                    Tổng cộng: <span className="text-blue-600 text-lg">{new Intl.NumberFormat('vi-VN').format(grandTotal)}</span>
                </div>
            </div>
        </div>
    );
};

// Material Form Modal
const MaterialFormModal = ({ material, onClose, onSave }: any) => {
    const [formData, setFormData] = useState(material || {
        code: '',
        name: '',
        category: 'MATERIAL',
        unit: '',
        unit_price: 0,
        min_stock: 0,
        max_stock: 0
    });

    const handleSubmit = async () => {
        try {
            const url = material
                ? `http://localhost:3000/api/hcsn/materials/${material.id}`
                : 'http://localhost:3000/api/hcsn/materials';
            const method = material ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                onSave();
                onClose();
            } else {
                const err = await res.json();
                alert('Lỗi: ' + err.error);
            }
        } catch (err) {
            console.error('Save material error:', err);
            alert('Không thể lưu vật tư');
        }
    };

    return (
        <FormModal title={material ? 'Sửa vật tư' : 'Thêm vật tư mới'} onClose={onClose} icon="inventory_2">
            <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold mb-1">Mã vật tư *</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border rounded"
                            value={formData.code}
                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                            disabled={!!material}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Tên vật tư *</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border rounded"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Loại *</label>
                        <select
                            className="w-full px-3 py-2 border rounded"
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                        >
                            <option value="MATERIAL">Vật liệu (TK 151)</option>
                            <option value="TOOLS">Công cụ dụng cụ (TK 152)</option>
                            <option value="GOODS">Hàng tồn kho (TK 153)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Đơn vị tính *</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border rounded"
                            value={formData.unit}
                            onChange={e => setFormData({ ...formData, unit: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Đơn giá</label>
                        <input
                            type="number"
                            className="w-full px-3 py-2 border rounded"
                            value={formData.unit_price}
                            onChange={e => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Định mức tồn tối thiểu</label>
                        <input
                            type="number"
                            className="w-full px-3 py-2 border rounded"
                            value={formData.min_stock}
                            onChange={e => setFormData({ ...formData, min_stock: parseFloat(e.target.value) })}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onClose} className="px-4 py-2 border rounded">Hủy</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">
                        {material ? 'Cập nhật' : 'Tạo mới'}
                    </button>
                </div>
            </div>
        </FormModal>
    );
};

// Receipt Form Modal
const ReceiptFormModal = ({ onClose, onSave, initialData }: any) => {
    const [formData, setFormData] = useState(initialData || {
        receipt_no: '',
        receipt_date: new Date().toISOString().split('T')[0],
        fund_source_id: 'fs_ns',
        supplier: '',
        warehouse: 'Kho chính',
        payment_method: '111',
        items: [] as any[]
    });
    const [materials, setMaterials] = useState<any[]>([]);

    useEffect(() => {
        fetch('http://localhost:3000/api/hcsn/materials', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
            .then(res => res.json())
            .then(data => setMaterials(data))
            .catch(err => console.error(err));

        // If editing, fetch details to get items
        if (initialData?.id && (!initialData.items || initialData.items.length === 0)) {
            fetch(`http://localhost:3000/api/hcsn/material-receipts/${initialData.id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data && data.items) {
                        setFormData((prev: any) => ({ ...prev, items: data.items }));
                    }
                })
                .catch(err => console.error(err));
        }
    }, [initialData]);

    const handleSubmit = async (status: 'DRAFT' | 'POSTED') => {
        try {
            const url = initialData?.id
                ? `http://localhost:3000/api/hcsn/material-receipts/${initialData.id}`
                : 'http://localhost:3000/api/hcsn/material-receipts';
            const method = initialData?.id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ...formData, status })
            });

            if (res.ok) {
                onSave();
                onClose();
            } else {
                const err = await res.json();
                alert('Lỗi: ' + err.error);
            }
        } catch (err) {
            alert('Lỗi khi lưu phiếu nhập');
        }
    };

    return (
        <FormModal title={initialData ? "Sửa Phiếu Nhập Kho" : "Lập Phiếu Nhập Kho"} onClose={onClose} sizeClass="max-w-4xl" icon="inventory_2">
            <div className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-bold mb-1">Số phiếu *</label>
                        <input
                            type="text" className="w-full px-3 py-2 border rounded"
                            value={formData.receipt_no}
                            onChange={e => setFormData({ ...formData, receipt_no: e.target.value })}
                            placeholder="PNK-..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Ngày nhập *</label>
                        <input
                            type="date" className="w-full px-3 py-2 border rounded"
                            value={formData.receipt_date}
                            onChange={e => setFormData({ ...formData, receipt_date: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Nguồn kinh phí</label>
                        <select
                            className="w-full px-3 py-2 border rounded"
                            value={formData.fund_source_id}
                            onChange={e => setFormData({ ...formData, fund_source_id: e.target.value })}
                        >

                            <option value="fs_ns">Ngân sách Nhà nước</option>
                            <option value="fs_phi">Nguồn thu phí, lệ phí</option>
                            <option value="fs_vien_tro">Nguồn viện trợ</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Thanh toán</label>
                        <select
                            className="w-full px-3 py-2 border rounded"
                            value={formData.payment_method}
                            onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                        >
                            <option value="111">Tiền mặt (111)</option>
                            <option value="112">Chuyển khoản (112)</option>
                            <option value="331">Chưa thanh toán (331)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Nhà cung cấp</label>
                        <input
                            type="text" className="w-full px-3 py-2 border rounded"
                            value={formData.supplier}
                            onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Kho nhận</label>
                        <input
                            type="text" className="w-full px-3 py-2 border rounded"
                            value={formData.warehouse}
                            onChange={e => setFormData({ ...formData, warehouse: e.target.value })}
                        />
                    </div>
                </div>

                <div className="border-t pt-4">
                    <h3 className="font-bold mb-2">Chi tiết vật tư</h3>
                    <EditableItemTable
                        items={formData.items}
                        setItems={items => setFormData({ ...formData, items })}
                        materials={materials}
                        type="RECEIPT"
                    />
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onClose} className="px-4 py-2 border rounded">Hủy</button>
                    <button onClick={() => handleSubmit('DRAFT')} className="px-4 py-2 border border-slate-300 bg-slate-100 rounded">Lưu Nháp</button>
                    <button onClick={() => handleSubmit('POSTED')} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">
                        Lưu & Ghi sổ
                    </button>
                </div>
            </div>
        </FormModal>
    );
};

// Issue Form Modal
const IssueFormModal = ({ onClose, onSave, initialData }: any) => {
    const [formData, setFormData] = useState(initialData || {
        issue_no: '',
        issue_date: new Date().toISOString().split('T')[0],
        department: '',
        receiver_name: '',
        purpose: '',
        warehouse: 'Kho chính',
        items: [] as any[]
    });
    const [materials, setMaterials] = useState<any[]>([]);

    useEffect(() => {
        fetch('http://localhost:3000/api/hcsn/materials', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
            .then(res => res.json())
            .then(data => setMaterials(data))
            .catch(err => console.error(err));

        if (initialData?.id && (!initialData.items || initialData.items.length === 0)) {
            fetch(`http://localhost:3000/api/hcsn/material-issues/${initialData.id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data && data.items) {
                        setFormData((prev: any) => ({ ...prev, items: data.items }));
                    }
                })
                .catch(err => console.error(err));
        }
    }, [initialData]);

    const handleSubmit = async (status: 'DRAFT' | 'POSTED') => {
        try {
            const url = initialData?.id
                ? `http://localhost:3000/api/hcsn/material-issues/${initialData.id}`
                : 'http://localhost:3000/api/hcsn/material-issues';
            const method = initialData?.id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ...formData, status })
            });

            if (res.ok) {
                onSave();
                onClose();
            } else {
                const err = await res.json();
                alert('Lỗi: ' + err.error);
            }
        } catch (err) {
            alert('Lỗi khi lưu phiếu xuất');
        }
    };

    return (
        <FormModal title={initialData ? "Sửa Phiếu Xuất Kho" : "Lập Phiếu Xuất Kho"} onClose={onClose} sizeClass="max-w-4xl" icon="output">
            <div className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-bold mb-1">Số phiếu *</label>
                        <input
                            type="text" className="w-full px-3 py-2 border rounded"
                            value={formData.issue_no}
                            onChange={e => setFormData({ ...formData, issue_no: e.target.value })}
                            placeholder="PXK-..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Ngày xuất *</label>
                        <input
                            type="date" className="w-full px-3 py-2 border rounded"
                            value={formData.issue_date}
                            onChange={e => setFormData({ ...formData, issue_date: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Kho xuất</label>
                        <input
                            type="text" className="w-full px-3 py-2 border rounded"
                            value={formData.warehouse}
                            onChange={e => setFormData({ ...formData, warehouse: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Bộ phận nhận</label>
                        <input
                            type="text" className="w-full px-3 py-2 border rounded"
                            value={formData.department}
                            onChange={e => setFormData({ ...formData, department: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Người nhận</label>
                        <input
                            type="text" className="w-full px-3 py-2 border rounded"
                            value={formData.receiver_name}
                            onChange={e => setFormData({ ...formData, receiver_name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Mục đích</label>
                        <input
                            type="text" className="w-full px-3 py-2 border rounded"
                            value={formData.purpose}
                            onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                        />
                    </div>
                </div>

                <div className="border-t pt-4">
                    <h3 className="font-bold mb-2">Chi tiết vật tư</h3>
                    <EditableItemTable
                        items={formData.items}
                        setItems={items => setFormData({ ...formData, items })}
                        materials={materials}
                        type="ISSUE"
                    />
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onClose} className="px-4 py-2 border rounded">Hủy</button>
                    <button onClick={() => handleSubmit('DRAFT')} className="px-4 py-2 border border-slate-300 bg-slate-100 rounded">Lưu Nháp</button>
                    <button onClick={() => handleSubmit('POSTED')} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">
                        Lưu & Ghi sổ
                    </button>
                </div>
            </div>
        </FormModal>
    );
};


// Transfer Form Modal
const TransferFormModal = ({ onClose, onSave, initialData }: any) => {
    const [formData, setFormData] = useState(initialData || {
        transfer_no: '',
        transfer_date: new Date().toISOString().split('T')[0],
        from_warehouse: 'Kho chính',
        to_warehouse: '',
        notes: '',
        items: [] as any[]
    });
    const [materials, setMaterials] = useState<any[]>([]);

    useEffect(() => {
        fetch('http://localhost:3000/api/hcsn/materials', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
            .then(res => res.json())
            .then(data => setMaterials(data))
            .catch(err => console.error(err));

        if (initialData?.id && (!initialData.items || initialData.items.length === 0)) {
            fetch(`http://localhost:3000/api/hcsn/material-transfers/${initialData.id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data && data.items) {
                        setFormData((prev: any) => ({ ...prev, items: data.items }));
                    }
                })
                .catch(err => console.error(err));
        }
    }, [initialData]);

    const handleSubmit = async (status: 'DRAFT' | 'POSTED') => {
        if (!formData.to_warehouse) {
            alert('Vui lòng chọn Kho nhận');
            return;
        }
        if (formData.from_warehouse === formData.to_warehouse) {
            alert('Kho nhận phải khác Kho xuất');
            return;
        }

        try {
            const url = initialData?.id
                ? `http://localhost:3000/api/hcsn/material-transfers/${initialData.id}`
                : 'http://localhost:3000/api/hcsn/material-transfers';
            const method = initialData?.id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ...formData, status })
            });

            if (res.ok) {
                onSave();
                onClose();
            } else {
                const err = await res.json();
                alert('Lỗi: ' + err.error);
            }
        } catch (err) {
            alert('Lỗi khi lưu phiếu điều chuyển');
        }
    };

    return (
        <FormModal title={initialData ? "Sửa Phiếu Điều Chuyển Kho" : "Lập Phiếu Điều Chuyển Kho"} onClose={onClose} sizeClass="max-w-4xl" icon="move_down">
            <div className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-bold mb-1">Số phiếu *</label>
                        <input
                            type="text" className="w-full px-3 py-2 border rounded"
                            value={formData.transfer_no}
                            onChange={e => setFormData({ ...formData, transfer_no: e.target.value })}
                            placeholder="PCK-..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Ngày điều chuyển *</label>
                        <input
                            type="date" className="w-full px-3 py-2 border rounded"
                            value={formData.transfer_date}
                            onChange={e => setFormData({ ...formData, transfer_date: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Ghi chú</label>
                        <input
                            type="text" className="w-full px-3 py-2 border rounded"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Từ Kho (Xuất)</label>
                        <input
                            type="text" className="w-full px-3 py-2 border rounded"
                            value={formData.from_warehouse}
                            onChange={e => setFormData({ ...formData, from_warehouse: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Đến Kho (Nhập) *</label>
                        <input
                            type="text" className="w-full px-3 py-2 border rounded"
                            value={formData.to_warehouse}
                            onChange={e => setFormData({ ...formData, to_warehouse: e.target.value })}
                            placeholder="Nhập tên kho nhận..."
                        />
                    </div>
                </div>

                <div className="border-t pt-4">
                    <h3 className="font-bold mb-2">Chi tiết vật tư điều chuyển</h3>
                    <EditableItemTable
                        items={formData.items}
                        setItems={items => setFormData({ ...formData, items })}
                        materials={materials}
                        type="ISSUE" // Reusing ISSUE type as it's similar (picking items)
                    />
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onClose} className="px-4 py-2 border rounded">Hủy</button>
                    <button onClick={() => handleSubmit('POSTED')} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">
                        Lưu & Điều chuyển
                    </button>
                </div>
            </div>
        </FormModal>
    );
};

// Inventory Card Modal
const InventoryCardModal = ({ material, onClose }: any) => {
    const [cardData, setCardData] = useState<any[]>([]);

    useEffect(() => {
        if (material) {
            fetch(`http://localhost:3000/api/hcsn/inventory/cards/${material.material_id || material.id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
                .then(res => res.json())
                .then(data => setCardData(data))
                .catch(err => console.error(err));
        }
    }, [material]);

    return (
        <FormModal title={`Thẻ kho: ${material.name || material.material_name}`} onClose={onClose} sizeClass="max-w-4xl" icon="history">
            <div className="p-6">
                <table className="w-full text-sm border-collapse border">
                    <thead className="bg-slate-100">
                        <tr>
                            <th className="border p-2">Nguồn kinh phí</th>
                            <th className="border p-2">Kho</th>
                            <th className="border p-2 text-right">Tồn đầu</th>
                            <th className="border p-2 text-right">Nhập</th>
                            <th className="border p-2 text-right">Xuất</th>
                            <th className="border p-2 text-right">Tồn cuối</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cardData.map((row, idx) => (
                            <tr key={idx} className="border-t">
                                <td className="border p-2">{row.fund_source_name || row.fund_source_id}</td>
                                <td className="border p-2">{row.warehouse}</td>
                                <td className="border p-2 text-right">{row.opening_qty}</td>
                                <td className="border p-2 text-right">{row.receipts_qty}</td>
                                <td className="border p-2 text-right">{row.issues_qty}</td>
                                <td className="border p-2 text-right font-bold">{row.closing_qty}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="mt-4 text-right">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 rounded">Đóng</button>
                </div>
            </div>
        </FormModal>
    );
};

// ==================== MAIN MODULE ====================

const normalizeView = (v?: string) => {
    if (!v || v === 'overview') return 'overview';
    if (v === 'items') return 'materials';
    if (v === 'receipt') return 'receipts';
    if (v === 'issue') return 'issues';
    if (v === 'transfer') return 'transfers';
    if (v === 'status') return 'summary';
    return v;
};

export const InventoryModule: React.FC<InventoryModuleProps> = ({ subView = 'materials', printSignal = 0, onSetHeader, onNavigate: _onNavigate }) => {
    const [view, setView] = useState(normalizeView(subView));
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showMaterialModal, setShowMaterialModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showCardModal, setShowCardModal] = useState(false);
    const [showPrintPreview, setShowPrintPreview] = useState(false);

    // Company Info State
    const [companyInfo, setCompanyInfo] = useState({ name: '', address: '' });

    useEffect(() => {
        settingsService.getSettings().then(res => {
            setCompanyInfo({
                name: res.data.company_name || 'Đơn vị...',
                address: res.data.company_address || 'Địa chỉ...'
            });
        }).catch(console.error);
    }, []);
    const [editingMaterial, setEditingMaterial] = useState<any>(null);
    const [selectedCardMaterial, setSelectedCardMaterial] = useState<any>(null);
    const [selectedRow, setSelectedRow] = useState<any>(null);

    // Handle print signal from Ribbon
    useEffect(() => {
        if (printSignal > 0) {
            // Only allow printing for voucher views (receipts, issues, transfers)
            const printableViews = ['receipts', 'receipt', 'issues', 'issue', 'transfers', 'transfer'];
            if (!printableViews.includes(view)) {
                alert('Chức năng in chỉ áp dụng cho Phiếu nhập kho, Phiếu xuất kho và Điều chuyển kho.');
                return;
            }

            if (!selectedRow) {
                alert('Vui lòng chọn một phiếu từ danh sách trước khi in.');
                return;
            }

            setShowPrintPreview(true);
        }
    }, [printSignal, view, selectedRow]);

    useEffect(() => {
        if (subView) setView(normalizeView(subView));
    }, [subView]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let url = '';
            if (view === 'materials') {
                url = 'http://localhost:3000/api/hcsn/materials';
            } else if (view === 'receipts' || view === 'receipt') {
                url = 'http://localhost:3000/api/hcsn/material-receipts';
            } else if (view === 'issues' || view === 'issue') {
                url = 'http://localhost:3000/api/hcsn/material-issues';
            } else if (view === 'transfers' || view === 'transfer') {
                url = 'http://localhost:3000/api/hcsn/material-transfers';
            } else if (view === 'summary') {
                const year = new Date().getFullYear();
                url = `http://localhost:3000/api/hcsn/inventory/summary?fiscal_year=${year}`;
            }

            if (!url) {
                if (view !== 'overview') {
                    console.warn('Unknown view for InventoryModule:', view);
                }
                setLoading(false);
                return;
            }

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            const result = await res.json();
            setData(Array.isArray(result) ? result : []);
        } catch (err) {
            console.error('Fetch inventory data failed:', err);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [view]);

    useEffect(() => {
        if (onSetHeader) {
            const getTitle = () => {
                switch (view) {
                    case 'materials': return 'Danh mục Vật tư';
                    case 'receipts':
                    case 'receipt': return 'Phiếu Nhập Kho';
                    case 'issues':
                    case 'issue': return 'Phiếu Xuất Kho';
                    case 'transfers':
                    case 'transfer': return 'Điều chuyển Kho';
                    case 'summary': return 'Tổng hợp Tồn kho';
                    default: return 'Quản lý Kho';
                }
            };

            const actions: RibbonAction[] = [];
            if (view === 'materials') {
                actions.push({
                    label: 'Thêm vật tư',
                    icon: 'add_circle',
                    onClick: () => {
                        setEditingMaterial(null);
                        setShowMaterialModal(true);
                    },
                    primary: true
                });
            } else if (view === 'receipts') {
                actions.push({
                    label: 'Nhập kho mới',
                    icon: 'add_circle',
                    onClick: () => { setSelectedRow(null); setShowReceiptModal(true); },
                    primary: true
                });
                if (selectedRow) {
                    actions.push({
                        label: 'Sửa phiếu',
                        icon: 'edit',
                        onClick: () => setShowReceiptModal(true)
                    });
                    actions.push({
                        label: 'In phiếu',
                        icon: 'print',
                        onClick: () => setShowPrintPreview(true)
                    });
                }
            } else if (view === 'issues') {
                actions.push({
                    label: 'Xuất kho mới',
                    icon: 'remove_circle',
                    onClick: () => { setSelectedRow(null); setShowIssueModal(true); },
                    primary: true
                });
                if (selectedRow) {
                    actions.push({
                        label: 'Sửa phiếu',
                        icon: 'edit',
                        onClick: () => setShowIssueModal(true)
                    });
                    actions.push({
                        label: 'In phiếu',
                        icon: 'print',
                        onClick: () => setShowPrintPreview(true)
                    });
                }
            } else if (view === 'transfers') {
                actions.push({
                    label: 'Điều chuyển mới',
                    icon: 'move_down',
                    onClick: () => { setSelectedRow(null); setShowTransferModal(true); },
                    primary: true
                });
                if (selectedRow) {
                    actions.push({
                        label: 'Sửa phiếu',
                        icon: 'edit',
                        onClick: () => setShowTransferModal(true)
                    });
                }
            }

            onSetHeader({ title: getTitle(), icon: 'inventory', actions });
        }
    }, [view, onSetHeader, selectedRow]);

    const formatNumber = (num: number) => new Intl.NumberFormat('vi-VN').format(num || 0);

    // ==================== COLUMN DEFINITIONS ====================

    const materialCols: ColumnDef[] = [
        { field: 'code', headerName: 'Mã VT', width: 'w-32' },
        { field: 'name', headerName: 'Tên vật tư', width: 'flex-1' },
        {
            field: 'category',
            headerName: 'Loại',
            width: 'w-40',
            renderCell: (v) => {
                if (v === 'MATERIAL') return <span className="text-blue-600">Vật liệu (151)</span>;
                if (v === 'TOOLS') return <span className="text-green-600">CCDC (152)</span>;
                if (v === 'GOODS') return <span className="text-purple-600">Hàng hóa (153)</span>;
                return v;
            }
        },
        { field: 'unit', headerName: 'ĐVT', width: 'w-24', align: 'center' },
        { field: 'unit_price', headerName: 'Đơn giá', width: 'w-32', align: 'right', renderCell: (v) => formatNumber(v) },
        {
            field: 'actions',
            headerName: '',
            width: 'w-24',
            renderCell: (_, row) => (
                <button
                    onClick={() => {
                        setEditingMaterial(row);
                        setShowMaterialModal(true);
                    }}
                    className="text-blue-600 hover:underline text-sm"
                >
                    Sửa
                </button>
            )
        }
    ];

    const receiptCols: ColumnDef[] = [
        { field: 'receipt_no', headerName: 'Số phiếu', width: 'w-36', align: 'center' },
        { field: 'receipt_date', headerName: 'Ngày nhập', width: 'w-32', type: 'date' },
        { field: 'fund_source_name', headerName: 'Nguồn kinh phí', width: 'w-48' },
        { field: 'supplier', headerName: 'Nhà cung cấp', width: 'flex-1' },
        { field: 'warehouse', headerName: 'Kho', width: 'w-32' },
        { field: 'total_amount', headerName: 'Tổng tiền', width: 'w-40', align: 'right', renderCell: (v) => <span className="font-mono font-bold">{formatNumber(v)}</span> }
    ];

    const issueCols: ColumnDef[] = [
        { field: 'issue_no', headerName: 'Số phiếu', width: 'w-36', align: 'center' },
        { field: 'issue_date', headerName: 'Ngày xuất', width: 'w-32', type: 'date' },
        { field: 'department', headerName: 'Bộ phận nhận', width: 'w-48' },
        { field: 'receiver_name', headerName: 'Người nhận', width: 'w-40' },
        { field: 'purpose', headerName: 'Mục đích', width: 'flex-1' },
        { field: 'total_amount', headerName: 'Tổng tiền', width: 'w-40', align: 'right', renderCell: (v) => <span className="font-mono font-bold">{formatNumber(v)}</span> }
    ];

    const transferCols: ColumnDef[] = [
        { field: 'transfer_no', headerName: 'Số phiếu', width: 'w-36', align: 'center' },
        { field: 'transfer_date', headerName: 'Ngày đ/c', width: 'w-32', type: 'date' },
        { field: 'from_warehouse', headerName: 'Từ Kho', width: 'w-48' },
        { field: 'to_warehouse', headerName: 'Đến Kho', width: 'w-48' },
        { field: 'notes', headerName: 'Ghi chú', width: 'flex-1' }
    ];

    const summaryCols: ColumnDef[] = [
        { field: 'material_code', headerName: 'Mã VT', width: 'w-32' },
        { field: 'material_name', headerName: 'Tên vật tư', width: 'flex-1' },
        { field: 'fund_source_name', headerName: 'Nguồn KP', width: 'w-40' },
        { field: 'opening_qty', headerName: 'Tồn đầu', width: 'w-28', align: 'right', renderCell: (v) => formatNumber(v) },
        { field: 'receipts_qty', headerName: 'Nhập', width: 'w-28', align: 'right', renderCell: (v) => <span className="text-blue-600">+{formatNumber(v)}</span> },
        { field: 'issues_qty', headerName: 'Xuất', width: 'w-28', align: 'right', renderCell: (v) => <span className="text-red-600">-{formatNumber(v)}</span> },
        { field: 'closing_qty', headerName: 'Tồn cuối', width: 'w-28', align: 'right', renderCell: (v) => <span className="font-bold">{formatNumber(v)}</span> },
        { field: 'closing_amount', headerName: 'Giá trị', width: 'w-40', align: 'right', renderCell: (v) => <span className="font-mono font-bold text-green-600">{formatNumber(v)}</span> },
        {
            field: 'actions',
            headerName: '',
            width: 'w-24',
            renderCell: (_, row) => (
                <button
                    onClick={() => {
                        setSelectedCardMaterial(row);
                        setShowCardModal(true);
                    }}
                    className="text-blue-600 hover:underline text-sm"
                >
                    Thẻ kho
                </button>
            )
        }
    ];

    // Show ModuleOverview when no specific subView or 'overview'
    if (view === 'overview' || view === '' || !view) {
        return (
            <ModuleOverview
                title={MODULE_CONFIGS.inventory.title}
                description={MODULE_CONFIGS.inventory.description}
                icon={MODULE_CONFIGS.inventory.icon}
                iconColor={MODULE_CONFIGS.inventory.iconColor}
                workflow={MODULE_CONFIGS.inventory.workflow}
                features={MODULE_CONFIGS.inventory.features}
                stats={[
                    { icon: 'inventory_2', label: 'Tổng danh mục', value: data.length || '-', color: 'blue' },
                    { icon: 'input', label: 'Nhập kho tháng này', value: '-', color: 'green' },
                    { icon: 'output', label: 'Xuất kho tháng này', value: '-', color: 'amber' },
                    { icon: 'check_circle', label: 'Trạng thái', value: 'Sẵn sàng', color: 'green' },
                ]}
            />
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
            <div className="px-6 py-3 bg-white/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0 backdrop-blur-md z-10">
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg">
                    {[
                        { key: 'materials', label: 'Danh mục VT' },
                        { key: 'receipts', label: 'Nhập kho' },
                        { key: 'issues', label: 'Xuất kho' },
                        { key: 'transfers', label: 'Điều chuyển' },
                        { key: 'summary', label: 'Tổng hợp tồn' }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setView(tab.key)}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${view === tab.key ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10 transition-opacity">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                {view === 'materials' && <SmartTable data={data} columns={materialCols} keyField="id" minRows={15} onRowClick={setSelectedRow} selectedRow={selectedRow} />}
                {view === 'receipts' && <SmartTable data={data} columns={receiptCols} keyField="id" minRows={15} onRowClick={setSelectedRow} selectedRow={selectedRow} />}
                {view === 'issues' && <SmartTable data={data} columns={issueCols} keyField="id" minRows={15} onRowClick={setSelectedRow} selectedRow={selectedRow} />}
                {view === 'transfers' && <SmartTable data={data} columns={transferCols} keyField="id" minRows={15} onRowClick={setSelectedRow} selectedRow={selectedRow} />}
                {view === 'summary' && <SmartTable data={data} columns={summaryCols} keyField="material_code" minRows={15} onRowClick={setSelectedRow} selectedRow={selectedRow} />}
            </div>

            {showMaterialModal && (
                <MaterialFormModal
                    material={editingMaterial}
                    onClose={() => {
                        setShowMaterialModal(false);
                        setEditingMaterial(null);
                    }}
                    onSave={() => {
                        fetchData();
                    }}
                />
            )}
            {showReceiptModal && <ReceiptFormModal onClose={() => setShowReceiptModal(false)} onSave={fetchData} initialData={selectedRow} />}
            {showIssueModal && <IssueFormModal onClose={() => setShowIssueModal(false)} onSave={fetchData} initialData={selectedRow} />}
            {showTransferModal && <TransferFormModal onClose={() => setShowTransferModal(false)} onSave={fetchData} initialData={selectedRow} />}
            {showCardModal && (
                <InventoryCardModal
                    material={selectedCardMaterial}
                    onClose={() => {
                        setShowCardModal(false);
                        setSelectedCardMaterial(null);
                    }}
                />
            )}

            {showPrintPreview && selectedRow && (
                <PrintPreviewModal
                    record={selectedRow}
                    view={view === 'receipts' ? 'RECEIPT' : view === 'issues' ? 'ISSUE' : 'TRANSFER'}
                    onClose={() => setShowPrintPreview(false)}
                    companyInfo={companyInfo}
                />
            )}
        </div>
    );
};
