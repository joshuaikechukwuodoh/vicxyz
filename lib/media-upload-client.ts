"use client";
import { genUploader } from "uploadthing/client";
import type { UploadRouter } from "./upload-router";
export const { uploadFiles } = genUploader<UploadRouter>();
