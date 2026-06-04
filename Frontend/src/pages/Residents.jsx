import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, AlertCircle } from "lucide-react";
import { residents } from "../data/mockData";
import { Button, Input, Select, StatusBadge } from "../components/common";
import { SectionHeader } from "../components/layout/SectionHeader";

export function Residents() {
  const [residentsList, setResidentsList] = useState(residents);
  const [filteredResidents, setFilteredResidents] = useState(residents);
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [residentEditingVehicle, setResidentEditingVehicle] = useState(null);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchFilters, setSearchFilters] = useState({
    name: "",
    room: "",
    idCard: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    room: "",
    birthYear: "",
    idCard: "",
    relation: "",
    status: "PERMANENT",
  });

  const handleSearch = () => {
    let results = residentsList;

    // Filter by name
    if (searchFilters.name.trim()) {
      results = results.filter(r => r.name.toLowerCase().includes(searchFilters.name.toLowerCase()));
    }

    // Filter by room
    if (searchFilters.room.trim()) {
      results = results.filter(r => r.room.includes(searchFilters.room.trim()));
    }

    // Filter by ID card
    if (searchFilters.idCard.trim()) {
      results = results.filter(r => r.idCard.includes(searchFilters.idCard.trim()));
    }

    setFilteredResidents(results);
  };

  const handleResetSearch = () => {
    setSearchFilters({ name: "", room: "", idCard: "" });
    setFilteredResidents(residentsList);
  };

  const handleAdd = () => {
    // Validate form
    if (!formData.name.trim() || !formData.room.trim() || !formData.birthYear.trim() || !formData.relation.trim()) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (editingIndex !== null) {
      // Update existing resident
      const updatedList = [...residentsList];
      updatedList[editingIndex] = {
        name: formData.name,
        room: formData.room,
        birthYear: formData.birthYear,
        idCard: formData.idCard || "",
        relation: formData.relation,
        status: formData.status,
      };
      setResidentsList(updatedList);
      setFilteredResidents(updatedList);
    } else {
      // Create new resident
      const newResident = {
        name: formData.name,
        room: formData.room,
        birthYear: formData.birthYear,
        idCard: formData.idCard || "",
        relation: formData.relation,
        status: formData.status,
      };

      const updatedList = [...residentsList, newResident];
      setResidentsList(updatedList);
      setFilteredResidents(updatedList);
    }
    
    // Reset form
    setFormData({
      name: "",
      room: "",
      birthYear: "",
      idCard: "",
      relation: "",
      status: "PERMANENT",
    });
    setError("");
    setEditingIndex(null);
    setShowForm(false);
  };

  const handleEdit = (index, resident) => {
    setFormData({
      name: resident.name,
      room: resident.room,
      birthYear: resident.birthYear,
      idCard: resident.idCard,
      relation: resident.relation,
      status: resident.status,
    });
    setEditingIndex(index);
    setShowForm(true);
    setError("");
  };

  const handleDeleteClick = () => {
    if (editingIndex !== null) {
      const resident = residentsList[editingIndex];
      setDeleteConfirm({ index: editingIndex, name: resident.name, room: resident.room });
    }
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      const updatedList = residentsList.filter((_, i) => i !== deleteConfirm.index);
      setResidentsList(updatedList);
      setFilteredResidents(updatedList.filter(r => {
        if (searchFilters.name.trim() && !r.name.toLowerCase().includes(searchFilters.name.toLowerCase())) return false;
        if (searchFilters.room.trim() && !r.room.includes(searchFilters.room.trim())) return false;
        if (searchFilters.idCard.trim() && !r.idCard.includes(searchFilters.idCard.trim())) return false;
        return true;
      }));
      setDeleteConfirm(null);
      setShowForm(false);
      setEditingIndex(null);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: "",
      room: "",
      birthYear: "",
      idCard: "",
      relation: "",
      status: "PERMANENT",
    });
    setError("");
    setShowForm(false);
    setEditingIndex(null);
  };

  return (
    <>
      <SectionHeader title="Quản lý nhân khẩu" desc="Thêm/sửa nhân khẩu, đăng ký thường trú hoặc tạm trú." action={<Button onClick={() => { setShowForm(true); setEditingIndex(null); setFormData({ name: "", room: "", birthYear: "", idCard: "", relation: "", status: "PERMANENT" }); }}><Plus className="h-4 w-4" /> Thêm nhân khẩu</Button>} />
      
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-3xl bg-white p-6 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 text-lg font-bold">{editingIndex !== null ? "Chỉnh sửa nhân khẩu" : "Thêm nhân khẩu mới"}</h3>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-1">
                <Input 
                  label="Họ tên" 
                  placeholder="Nguyễn Văn A"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
                <Input 
                  label="Căn hộ" 
                  placeholder="1201"
                  value={formData.room}
                  onChange={(e) => setFormData({...formData, room: e.target.value})}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-1">
                <Input 
                  label="Năm sinh" 
                  placeholder="1990"
                  value={formData.birthYear}
                  onChange={(e) => setFormData({...formData, birthYear: e.target.value})}
                />
                <Input 
                  label="CCCD/CMND" 
                  placeholder="Có thể bỏ trống"
                  value={formData.idCard}
                  onChange={(e) => setFormData({...formData, idCard: e.target.value})}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-1">
                <Input 
                  label="Quan hệ với chủ hộ" 
                  placeholder="Chủ hộ, Vợ, Con, v.v."
                  value={formData.relation}
                  onChange={(e) => setFormData({...formData, relation: e.target.value})}
                />
                <Select 
                  label="Cư trú" 
                  value={formData.status} 
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="PERMANENT">Thường trú</option>
                  <option value="TEMPORARY">Tạm trú</option>
                </Select>
              </div>
              {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</div>}
              <div className="flex justify-between gap-3 pt-4">
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={handleCancel}>Hủy</Button>
                  {editingIndex !== null && (
                    <Button variant="danger" onClick={handleDeleteClick}>Xóa cư dân</Button>
                  )}
                </div>
                <Button onClick={handleAdd}>{editingIndex !== null ? "Lưu" : "Thêm nhân khẩu"}</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-3xl bg-white p-6 shadow-xl max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-rose-100 p-3">
                <AlertCircle className="h-6 w-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Xóa nhân khẩu</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Bạn có chắc muốn xóa nhân khẩu <strong>{deleteConfirm.name}</strong> (Căn {deleteConfirm.room})? Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Hủy</Button>
              <Button variant="danger" onClick={handleConfirmDelete}>Xóa nhân khẩu</Button>
            </div>
          </motion.div>
        </div>
      )}
      
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <Input 
          label="Tìm theo họ tên" 
          placeholder="Nhập họ tên"
          value={searchFilters.name}
          onChange={(e) => setSearchFilters({...searchFilters, name: e.target.value})}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Input 
          label="Tìm theo căn hộ" 
          placeholder="Nhập số căn"
          value={searchFilters.room}
          onChange={(e) => setSearchFilters({...searchFilters, room: e.target.value})}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Input 
          label="Tìm theo CCCD/CMND" 
          placeholder="Nhập CCCD/CMND"
          value={searchFilters.idCard}
          onChange={(e) => setSearchFilters({...searchFilters, idCard: e.target.value})}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>
      <div className="mb-5 flex gap-3">
        <Button onClick={handleSearch}><Search className="h-4 w-4" /> Tìm kiếm</Button>
        <Button variant="secondary" onClick={handleResetSearch}>Xoá bộ lọc</Button>
      </div>
      
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Căn hộ</th>
                <th className="px-5 py-4">Họ tên</th>
                <th className="px-5 py-4">Năm sinh</th>
                <th className="px-5 py-4">CCCD/CMND</th>
                <th className="px-5 py-4">Quan hệ</th>
                <th className="px-5 py-4">Cư trú</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredResidents.map((r, idx) => {
                const originalIdx = residentsList.findIndex(resident => 
                  resident.name === r.name && resident.room === r.room && resident.birthYear === r.birthYear
                );
                return (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{r.room}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{r.name}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{r.birthYear}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{r.idCard}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{r.relation}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => handleEdit(originalIdx, r)} className="font-semibold text-sky-700 hover:text-sky-900">Chi tiết</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

