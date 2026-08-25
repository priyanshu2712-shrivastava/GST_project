"use client";

import { useState, useCallback } from "react";
import { uploadBill, uploadBillsBulk, processBill } from "@/lib/api";
import type { UploadResponse } from "@/lib/api";
import { StatusBadge, T, Spinner } from "@/components/UIComponents";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { UploadCloud, FileText, Image as ImageIcon, ArrowRight } from "lucide-react";

function UploadContent() {
    const [dragActive, setDragActive] = useState(false);
    const [uploads, setUploads] = useState<(UploadResponse & { processing?: boolean; processed?: boolean })[]>([]);
    const [uploading, setUploading] = useState(false);

    const handleFiles = useCallback(async (files: FileList | File[]) => {
        const fileArray = Array.from(files);
        if (fileArray.length === 0) return;

        setUploading(true);
        try {
            if (fileArray.length === 1) {
                const res = await uploadBill(fileArray[0]);
                setUploads((prev) => [res, ...prev]);
            } else {
                const res = await uploadBillsBulk(fileArray);
                setUploads((prev) => [...res.uploaded, ...prev]);
            }
        } catch (err: unknown) {
            alert("Upload failed. Is the backend running?");
        } finally {
            setUploading(false);
        }
    }, []);

    const handleProcess = async (billId: number, idx: number) => {
        setUploads((prev) =>
            prev.map((u, i) => (i === idx ? { ...u, processing: true } : u))
        );
        try {
            await processBill(billId);
            setUploads((prev) =>
                prev.map((u, i) =>
                    i === idx ? { ...u, processing: false, processed: true, status: "processed" } : u
                )
            );
        } catch {
            setUploads((prev) =>
                prev.map((u, i) =>
                    i === idx ? { ...u, processing: false, status: "error" } : u
                )
            );
        }
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        handleFiles(e.dataTransfer.files);
    };

    return (
        <div className={T.pageNarrow}>
            <div className="mb-8">
                <h1 className={T.h1}>Upload bills</h1>
                <p className={T.sub}>Upload invoice images or PDFs for processing</p>
            </div>

            {/* Dropzone */}
            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                className={`relative cursor-pointer rounded-2xl border border-dashed p-14 text-center transition-colors ${dragActive
                    ? "border-[#0a0a0a] bg-[#f0ff44]/20"
                    : "border-[#d5cec4] bg-white hover:border-[#0a0a0a]/40"
                    }`}
                onClick={() => document.getElementById("file-input")?.click()}
            >
                <input
                    id="file-input"
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf,.bmp,.tiff"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />

                {uploading ? (
                    <div>
                        <Spinner className="mx-auto mb-4 h-8 w-8" />
                        <p className="text-sm text-[#555]">Uploading...</p>
                    </div>
                ) : (
                    <>
                        <UploadCloud className="mx-auto h-8 w-8 text-[#b8b0a4]" strokeWidth={1.5} />
                        <p className="font-display mt-4 text-base font-semibold text-[#0a0a0a]">
                            Drop files here or click to browse
                        </p>
                        <p className="mt-1.5 text-sm text-[#888]">
                            Supports JPG, PNG, PDF, BMP, TIFF — single or bulk upload
                        </p>
                    </>
                )}
            </div>

            {/* Upload Results */}
            {uploads.length > 0 && (
                <div className={`mt-8 ${T.card}`}>
                    <div className={T.cardHeader}>
                        <h2 className={T.h2}>Uploaded files</h2>
                        <span className="tabular text-xs text-[#888]">{uploads.length}</span>
                    </div>
                    <div className={T.tbody}>
                        {uploads.map((upload, idx) => (
                            <div
                                key={`${upload.id}-${idx}`}
                                className="flex items-center justify-between gap-4 px-5 py-4"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    {upload.file_name.endsWith(".pdf") ? (
                                        <FileText className="h-4 w-4 shrink-0 text-[#888]" strokeWidth={1.75} />
                                    ) : (
                                        <ImageIcon className="h-4 w-4 shrink-0 text-[#888]" strokeWidth={1.75} />
                                    )}
                                    <div className="min-w-0">
                                        <Link
                                            href={`/bills/${upload.id}`}
                                            className={`block truncate text-sm ${T.link}`}
                                        >
                                            {upload.file_name}
                                        </Link>
                                        <p className="tabular mt-0.5 text-xs text-[#888]">ID: {upload.id}</p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-3">
                                    <StatusBadge status={upload.status} />
                                    {upload.status === "pending" && !upload.processing && (
                                        <button
                                            onClick={() => handleProcess(upload.id, idx)}
                                            className={T.btnGhost}
                                        >
                                            Process
                                            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                                        </button>
                                    )}
                                    {upload.processing && (
                                        <span className="flex items-center gap-1.5 text-xs text-[#555]">
                                            <Spinner className="h-3 w-3" />
                                            Processing...
                                        </span>
                                    )}
                                    {upload.processed && (
                                        <Link href={`/bills/${upload.id}`} className={T.btnGhost}>
                                            View results
                                            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function UploadPage() {
    return (
        <ProtectedRoute>
            <UploadContent />
        </ProtectedRoute>
    );
}
