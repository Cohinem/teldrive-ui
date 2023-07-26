import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/router"
import { ModalState, QueryParams } from "@/ui/types"
import {
  ChonkyActions,
  FileBrowser,
  FileContextMenu,
  FileList,
  FileNavbar,
  FileToolbar,
} from "@bhunter179/chonky"
import { styled } from "@mui/material/styles"
import useMediaQuery from "@mui/material/useMediaQuery"
import { useQueryClient } from "@tanstack/react-query"
import {
  StateSnapshot,
  VirtuosoGridHandle,
  VirtuosoHandle,
} from "react-virtuoso"

import {
  useDeleteFile,
  useFetchFiles,
  usePreloadFiles,
} from "@/ui/hooks/queryhooks"
import { useDevice } from "@/ui/hooks/useDevice"
import Loader from "@/ui/components/Loader"
import {
  CopyDownloadLink,
  CreateFolder,
  DeleteFile,
  DownloadFile,
  handleAction,
  OpenInVLCPlayer,
  RenameFile,
  SyncFiles,
  UploadFiles,
} from "@/ui/utils/chonkyactions"
import { chainLinks, getFiles } from "@/ui/utils/common"

import FileModal from "./FileModal"
import Upload from "./upload"

const PreviewModal = dynamic(() => import("./PreviewModal"), {
  ssr: false,
  loading: () => <Loader />,
})

const PREFIX = "MyFileBrowser"

const classes = {
  root: `${PREFIX}-root`,
  progress: `${PREFIX}-progress`,
}

const Root = styled(
  "div",
  {}
)(({ theme }) => ({
  [`&.${classes.root}`]: {
    height: "100%",
    width: "100%",
    margin: "auto",
  },

  [`& .${classes.progress}`]: {
    margin: "auto",
    color: theme.palette.text.primary,
    height: "30px !important",
    width: "30px !important",
  },
}))

let firstRender = true

function isVirtuosoList(value: any): value is VirtuosoHandle {
  return (value as VirtuosoHandle).getState !== undefined
}

const MyFileBrowser = () => {
  const positions = useRef<Map<string, StateSnapshot>>(new Map()).current

  const [queryEnabled, setqueryEnabled] = useState(false)

  const { isMobile } = useDevice()

  const router = useRouter()

  const { path } = router.query

  const type = path?.[0]

  const queryClient = useQueryClient()

  const isSm = useMediaQuery("(max-width:600px)")

  const uploadRef = useRef<{ openUpload: () => void }>(null)

  const listRef = useRef<VirtuosoHandle | VirtuosoGridHandle>(null)

  const { preloadFiles } = usePreloadFiles()

  const fileActions = useMemo(
    () => [
      DownloadFile,
      RenameFile,
      DeleteFile,
      CopyDownloadLink,
      OpenInVLCPlayer,
      SyncFiles,
      CreateFolder(isSm ? "Actions" : "", type),
      UploadFiles(isSm ? "Actions" : "", type),
    ],
    [isSm, type]
  )

  useEffect(() => {
    if (type === "my-drive") setqueryEnabled(true)
    else if (type === "search" && path!.length > 1) {
      setqueryEnabled(true)
    } else if (type === "starred") {
      setqueryEnabled(true)
    } else if (type === "recent") {
      setqueryEnabled(true)
    } else {
      setqueryEnabled(false)
    }
  }, [path])

  const queryParams: Partial<QueryParams> = useMemo(() => {
    return {
      key: "files",
      path,
      enabled: queryEnabled,
    }
  }, [queryEnabled, path])

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useFetchFiles(queryParams)

  const files = useMemo(
    () =>
      data
        ? data?.pages?.flatMap((page) =>
            page?.results ? getFiles(page?.results) : []
          )
        : [],
    [data]
  )

  const folderChain = useMemo(() => {
    if (type == "my-drive") {
      return Object.entries(chainLinks(path as string[])).map(
        ([key, value]) => ({
          id: key,
          name: key,
          path: value,
          isDir: true,
          chain: true,
        })
      )
    }
  }, [path])

  const [modalState, setModalState] = useState<Partial<ModalState>>({
    open: false,
    operation: "rename_file",
  })

  const { mutation: deleteMutation } = useDeleteFile(queryParams)

  const { file, open, operation } = modalState

  useEffect(() => {
    if (operation === DeleteFile.id) deleteMutation.mutate({ id: file?.id })
  }, [operation, file?.id])

  const handleFileAction = useCallback(
    () =>
      handleAction(
        router,
        setModalState,
        queryClient,
        path,
        uploadRef.current?.openUpload!,
        preloadFiles
      ),
    [router, setModalState, queryClient, preloadFiles]
  )

  useEffect(() => {
    if (firstRender) {
      firstRender = false
      return
    }

    setTimeout(() => {
      listRef.current?.scrollTo({
        top: positions.get(router.asPath)?.scrollTop ?? 0,
        left: 0,
      })
    }, 0)

    return () => {
      if (listRef.current && isVirtuosoList(listRef.current))
        listRef.current?.getState((state) =>
          positions.set(router.asPath, state)
        )
    }
  }, [router.asPath])

  return (
    <Root className={classes.root}>
      <FileBrowser
        files={files as any}
        folderChain={folderChain}
        onFileAction={handleFileAction()}
        fileActions={fileActions}
        disableDragAndDropProvider={isMobile ? true : false}
        defaultFileViewActionId={ChonkyActions.EnableListView.id}
        useStoreProvider={true}
        useThemeProvider={false}
        defaultSortActionId={null}
      >
        <FileNavbar />

        <FileToolbar hideSearchBar={true} />
        <FileList
          hasNextPage={hasNextPage}
          isNextPageLoading={isFetchingNextPage}
          loadNextPage={fetchNextPage}
          ref={listRef}
        />
        <FileContextMenu />
      </FileBrowser>
      {modalState.type === "file" && open && (
        <FileModal
          modalState={modalState}
          setModalState={setModalState}
          queryParams={queryParams}
          path={path}
        />
      )}

      {modalState.type === "preview" && open && (
        <PreviewModal
          queryParams={queryParams}
          modalState={modalState}
          setModalState={setModalState}
        />
      )}
      {/* <Upload ref={uploadRef} path={path as string[]} /> */}
    </Root>
  )
}

export default memo(MyFileBrowser)