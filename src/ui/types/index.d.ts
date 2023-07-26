import { FileData } from "@bhunter179/chonky"

import { Media } from "@/api/schemas/file.schema"

export type FileResponse = { results?: File[]; nextPageToken?: string }

export type File = {
  name: string
  type: string
  mimeType: string
  path?: string
  size: number
  depth: number
  createdAt: string
  updatedAt: string
  userId: string
  parentId: string
  id: string
  starred: boolean
}

export type ModalState = {
  open: boolean
  operation: string
  type: string
  file: FileData
  name: string
}

export type Params = {
  nextPageToken: string
  perPage: number
  order: string
  path: string
  search: string
  sort: string
  starred: boolean
  type: string
  op: string
  view: string
}

export type QueryParams = {
  key: string
  path: string | string[] | undefined
  enabled: boolean
}

export type FilePayload = {
  id?: string
  payload?: Record<string, any>
}

export type Message = {
  status: boolean
  message?: string
}