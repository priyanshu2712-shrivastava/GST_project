"use client";

import { useState, useCallback } from "react";
import { uploadBill, uploadBillsBulk, processBill } from "@/lib/api";
import type { UploadResponse } from "@/lib/api";
import { StatusBadge } from "@/components/UIComponents";
import Link from "next/link";

export default function UploadPage() {
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
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    Upload Bills
                </h1>
                <p className="text-gray-500 mt-1">
                    Upload invoice images or PDFs for processing
                </p>
            </div>

            {/* Dropzone */}
            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                className={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-all cursor-pointer ${dragActive
                        ? "border-indigo-500 bg-indigo-500/5"
                        : "border-gray-700 hover:border-gray-600 bg-gray-900/30"
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
                        <div className="h-10 w-10 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-300">Uploading...</p>
                    </div>
                ) : (
                    <>
                        <p className="text-5xl mb-4">📁</p>
                        <p className="text-lg font-medium text-gray-300 mb-2">
                            Drop files here or click to browse
                        </p>
                        <p className="text-sm text-gray-500">
                            Supports JPG, PNG, PDF, BMP, TIFF — single or bulk upload
                        </p>
                    </>
                )}
            </div>

            {/* Upload Results */}
            {uploads.length > 0 && (
                <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900/50">
                    <div className="p-5 border-b border-gray-800">
                        <h2 className="text-lg font-semibold">Uploaded Files</h2>
                    </div>
                    <div className="divide-y divide-gray-800/50">
                        {uploads.map((upload, idx) => (
                            <div
                                key={`${upload.id}-${idx}`}
                                className="flex items-center justify-between px-5 py-4"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">
                                        {upload.file_name.endsWith(".pdf") ? "📄" : "🖼️"}
                                    </span>
                                    <div>
                                        <Link
                                            href={`/bills/${upload.id}`}
                                            className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
                                        >
                                            {upload.file_name}
                                        </Link>
                                        <p className="text-xs text-gray-500">ID: {upload.id}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <StatusBadge status={upload.status} />
                                    {upload.status === "pending" && !upload.processing && (
                                        <button
                                            onClick={() => handleProcess(upload.id, idx)}
                                            className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium transition-colors"
                                        >
                                            Process →
                                        </button>
                                    )}
                                    {upload.processing && (
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                            <span className="h-3 w-3 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                                            Processing...
                                        </span>
                                    )}
                                    {upload.processed && (
                                        <Link
                                            href={`/bills/${upload.id}`}
                                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
                                        >
                                            View Results →
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
