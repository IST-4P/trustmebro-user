"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from "react"
import Link from "next/link"
import Hls from "hls.js"
import { Heart, MessageCircle, RefreshCcw, ShoppingCart, Star } from "lucide-react"
import api from "@/lib/api"
import type { Product } from "@/lib/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://trustmebro-web.hacmieu.xyz"
const DEBUG = true

const logDebug = (...args: any[]) => {
  if (!DEBUG) return
  console.log("[VideoFeed]", ...args)
}
const PAGE_LIMIT = 10

interface VideoItem {
  id: string
  title?: string
  status?: string
  duration?: number
  width?: number
  height?: number
  createdAt?: string
  updatedAt?: string
  likeCount?: number
  commentCount?: number
  authorId?: string
  authorUsername?: string
  authorAvatar?: string
  productId?: string
}

interface PlaybackInfo {
  manifestUrl: string
  thumbnailUrl?: string
  playbackToken?: string
  expiresAt?: number
}

type PlaybackState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; info: PlaybackInfo }
  | { status: "error"; error: string }

const buildPlaybackUrl = (info: PlaybackInfo) => info.manifestUrl

const formatPrice = (value?: number) => {
  if (!value) return "0 VND"
  return `${Math.round(value).toLocaleString("vi-VN")} VND`
}

const getProductImage = (product?: Product | null) => {
  if (!product) return ""
  if (Array.isArray(product.images) && product.images[0]) return product.images[0]
  return ""
}

const getProductPrice = (product?: Product | null) =>
  product?.basePrice ?? product?.price ?? product?.minPrice ?? 0

const getProductOriginalPrice = (product?: Product | null) =>
  product?.virtualPrice ?? product?.salePrice ?? product?.maxPrice

const getProductRating = (product?: Product | null) =>
  product?.rating ?? product?.averageRate ?? 0

const formatCount = (value?: number) => {
  if (!value || value <= 0) return "0"
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

const viewHeightClass = "h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]"
const portraitFrameClass = "w-full h-full md:mx-auto md:w-[56.25vh] md:max-w-[560px]"
const landscapeFrameClass = "w-full h-full md:mx-auto md:max-w-[960px]"

function VideoSlide({
  video,
  playback,
  isActive,
  onRetry,
  product,
  productLoading,
}: {
  video: VideoItem
  playback?: PlaybackState
  isActive: boolean
  onRetry: (id: string) => void
  product?: Product
  productLoading?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  const isActiveRef = useRef(isActive)
  
  // Debug: Log product info
  useEffect(() => {
    if (isActive) {
      console.log('[VideoSlide] Active video:', {
        videoId: video.id,
        productId: video.productId,
        hasProduct: !!product,
        productLoading,
        productName: product?.name
      })
    }
  }, [isActive, video.id, video.productId, product, productLoading])
  
  const initialAspectRatio = useMemo(() => {
    if (!video.width || !video.height) return null
    return video.width / video.height
  }, [video.height, video.width])
  const [aspectRatio, setAspectRatio] = useState<number | null>(initialAspectRatio)

  useEffect(() => {
    isActiveRef.current = isActive
  }, [isActive])

  useEffect(() => {
    setAspectRatio(initialAspectRatio)
  }, [initialAspectRatio])

  const isLandscape = typeof aspectRatio === "number" ? aspectRatio > 1.05 : false
  const frameClassName = isLandscape ? landscapeFrameClass : portraitFrameClass

  const playbackUrl = useMemo(() => {
    if (playback?.status !== "ready") return ""
    return buildPlaybackUrl(playback.info)
  }, [playback])
  const playbackToken = playback?.status === "ready" ? playback.info.playbackToken : undefined

  useEffect(() => {
    const videoEl = videoRef.current
    if (!videoEl || !playbackUrl || !playbackToken) {
      if (video.id) {
        logDebug("Skip HLS init - missing data", {
          videoId: video.id,
          hasVideoEl: Boolean(videoEl),
          hasPlaybackUrl: Boolean(playbackUrl),
          hasPlaybackToken: Boolean(playbackToken),
        })
      }
      return
    }
    let hls: Hls | null = null
    const attemptPlay = () => {
      if (!isActiveRef.current) return
      videoEl.muted = false
      const playPromise = videoEl.play()
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          // If autoplay fails, try with muted
          videoEl.muted = true
          videoEl.play().catch(() => {
            // Ignore autoplay failures
          })
        })
      }
    }

    const handleCanPlay = () => {
      attemptPlay()
    }
    const handleVideoError = () => {
      logDebug("HTMLVideoElement error", video.id, videoEl.error)
    }
    videoEl.addEventListener("canplay", handleCanPlay)
    videoEl.addEventListener("error", handleVideoError)
    const nativeSupport = videoEl.canPlayType("application/vnd.apple.mpegurl")
    logDebug("HLS support check", video.id, {
      hlsJs: Hls.isSupported(),
      native: nativeSupport,
    })

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        xhrSetup: (xhr) => {
          xhr.setRequestHeader("Authorization", `Bearer ${playbackToken}`)
        },
      })
      logDebug("Init HLS.js", video.id, {
        playbackUrl,
        hasToken: Boolean(playbackToken),
      })
      hlsRef.current = hls
      hls.loadSource(playbackUrl)
      hls.attachMedia(videoEl)
      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        logDebug("HLS manifest parsed", video.id, {
          levels: Array.isArray(data?.levels) ? data.levels.length : 0,
        })
        attemptPlay()
      })
      hls.on(Hls.Events.ERROR, (_, data) => {
        logDebug("HLS error", video.id, data)
        if (data?.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              logDebug("HLS network error - retrying", video.id)
              hls?.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              logDebug("HLS media error - recovering", video.id)
              hls?.recoverMediaError()
              break
            default:
              logDebug("HLS fatal error - destroying", video.id)
              hls?.destroy()
              break
          }
        }
      })
      hls.on(Hls.Events.MANIFEST_LOADING, () => logDebug("HLS manifest loading", video.id))
      hls.on(Hls.Events.MANIFEST_LOADED, () => logDebug("HLS manifest loaded", video.id))
      hls.on(Hls.Events.LEVEL_LOADED, (_, data) => logDebug("HLS level loaded", video.id, data?.level))
      hls.on(Hls.Events.FRAG_LOADED, (_, data) => logDebug("HLS fragment loaded", video.id, data?.frag?.sn))
      return () => {
        if (hls) {
          hls.destroy()
        }
        hlsRef.current = null
        videoEl.removeEventListener("canplay", handleCanPlay)
        videoEl.removeEventListener("error", handleVideoError)
      }
    }

    if (nativeSupport) {
      logDebug("Using native HLS", video.id, playbackUrl)
      videoEl.src = playbackUrl
      attemptPlay()
      return () => {
        videoEl.removeEventListener("canplay", handleCanPlay)
        videoEl.removeEventListener("error", handleVideoError)
        videoEl.pause()
        videoEl.removeAttribute("src")
        videoEl.load()
      }
    }

    logDebug("HLS not supported in this browser", video.id)
    return () => {
      videoEl.removeEventListener("canplay", handleCanPlay)
      videoEl.removeEventListener("error", handleVideoError)
    }
  }, [playbackToken, playbackUrl])

  useEffect(() => {
    const videoEl = videoRef.current
    if (!videoEl) return
    if (!isActive) {
      videoEl.pause()
      return
    }

    const playPromise = videoEl.play()
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // Ignore autoplay failures.
      })
    }
  }, [isActive, playbackUrl])

  const isReady = !video.status || video.status === "READY"
  const isLoading = playback?.status === "loading" || playback?.status === "idle"
  const playbackError = playback?.status === "error" ? playback.error : null
  const poster = playback?.status === "ready" ? playback.info.thumbnailUrl : undefined
  const productImage = getProductImage(product)
  const productPrice = getProductPrice(product)
  const productOriginalPrice = getProductOriginalPrice(product)
  const productRating = getProductRating(product)
  const productReviewCount = product?.reviewCount ?? product?.ratingCount ?? 0
  const handleTogglePlayback = () => {
    const videoEl = videoRef.current
    if (!videoEl) return
    if (videoEl.paused) {
      const playPromise = videoEl.play()
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          // Ignore autoplay failures.
        })
      }
      return
    }
    videoEl.pause()
  }

  const handleLoadedMetadata = () => {
    const videoEl = videoRef.current
    if (!videoEl?.videoWidth || !videoEl.videoHeight) return
    const ratio = videoEl.videoWidth / videoEl.videoHeight
    if (!Number.isFinite(ratio) || ratio <= 0) return
    setAspectRatio((prev) => (prev && Math.abs(prev - ratio) < 0.01 ? prev : ratio))
  }

  return (
    <div className={`relative w-full ${viewHeightClass} snap-start bg-black`}>
      <div className="absolute inset-0">
        {poster ? (
          <div
            className="absolute inset-0 scale-110 bg-center bg-cover blur-2xl"
            style={{ backgroundImage: `url(${poster})` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-black/40" />
      </div>
      <div className={`relative z-10 ${frameClassName}`}>
        <video
          ref={videoRef}
          className="h-full w-full cursor-pointer object-contain"
          poster={poster}
          playsInline
          loop
          preload="metadata"
          autoPlay
          onLoadedMetadata={handleLoadedMetadata}
          onClick={handleTogglePlayback}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-white/10">
              {video.authorAvatar ? (
                <img
                  src={video.authorAvatar}
                  alt={video.authorUsername || "Tác giả"}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {video.authorUsername || "Ẩn danh"}
              </p>
              <p className="text-xs text-white/70">{video.title || "Video"}</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-24 right-4 flex justify-end">
          <div className="flex flex-col items-center gap-4 text-white">
          <div className="flex flex-col items-center gap-1">
            <Heart className="h-6 w-6" />
            <span className="text-xs">{formatCount(video.likeCount)}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <MessageCircle className="h-6 w-6" />
            <span className="text-xs">{formatCount(video.commentCount)}</span>
          </div>
          </div>
        </div>

        {video.productId ? (
          <div className="absolute bottom-20 left-4 right-20 z-20 sm:right-auto sm:max-w-[440px]">
            {product ? (
              <Link
                href={`/buyer/products/${video.productId}`}
                className="block"
                aria-label={`Xem ${product.name}`}
              >
                <div className="relative overflow-hidden rounded-2xl bg-white/80 shadow-2xl ring-1 ring-white/20 backdrop-blur-xl">
                  {/* Discount Badge */}
                  {productOriginalPrice && productOriginalPrice > productPrice ? (
                    <div className="absolute left-0 top-0 z-10 rounded-br-lg bg-gradient-to-r from-red-500 to-red-600 px-2 py-1 text-xs font-bold text-white shadow-lg backdrop-blur-sm">
                      -{Math.round(((productOriginalPrice - productPrice) / productOriginalPrice) * 100)}%
                    </div>
                  ) : null}
                  
                  {/* Product Info */}
                  <div className="flex items-start gap-3 p-3 backdrop-blur-sm">
                    {/* Product Image */}
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 shadow-md ring-1 ring-black/5">
                      {productImage ? (
                        <img src={productImage} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-gray-200" />
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="min-w-0 flex-1">
                      {/* Product Name */}
                      <p className="mb-1 line-clamp-2 text-sm font-semibold leading-tight text-gray-900">
                        {product.name}
                      </p>

                      {/* Rating & Sold Count */}
                      <div className="mb-2 flex items-center gap-3 text-xs text-gray-700">
                        {productRating > 0 ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{productRating.toFixed(1)}</span>
                            {productReviewCount > 0 ? (
                              <span className="text-gray-500">({formatCount(productReviewCount)})</span>
                            ) : null}
                          </div>
                        ) : null}
                        {product.soldCount ? (
                          <span className="text-gray-600">
                            Đã bán {formatCount(product.soldCount)}
                          </span>
                        ) : null}
                      </div>

                      {/* Price Section */}
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-red-600">
                          {formatPrice(productPrice)}
                        </span>
                        {productOriginalPrice && productOriginalPrice > productPrice ? (
                          <span className="text-xs text-gray-400 line-through">
                            {formatPrice(productOriginalPrice)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="border-t border-white/30 bg-gradient-to-r from-buyer-primary/90 to-pink-500/90 px-4 py-2.5 backdrop-blur-sm">
                    <div className="flex items-center justify-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-white" />
                      <span className="text-sm font-bold text-white drop-shadow-sm">Mua ngay</span>
                    </div>
                  </div>
                </div>
              </Link>
            ) : product === null && !productLoading ? (
              <div className="rounded-2xl bg-white/75 p-4 shadow-xl ring-1 ring-white/20 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100/80 backdrop-blur-sm">
                    <ShoppingCart className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">Sản phẩm không khả dụng</p>
                    <p className="mt-1 text-xs text-gray-600">Sản phẩm này đã hết hàng hoặc không còn bán</p>
                  </div>
                </div>
              </div>
            ) : productLoading ? (
              <div className="rounded-2xl bg-white/75 p-4 shadow-xl ring-1 ring-white/20 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="h-20 w-20 animate-pulse rounded-lg bg-gray-200/80" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200/80" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200/80" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200/80" />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {!isReady ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
          <p className="text-lg font-semibold">Video đang xử lý</p>
          <p className="text-sm text-white/70">Vui lòng thử lại sau.</p>
        </div>
      ) : null}

      {isReady && isLoading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
          <p className="mt-4 text-sm text-white/70">Đang tải video...</p>
        </div>
      ) : null}

      {isReady && playbackError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
          <p className="text-lg font-semibold">Không thể tải video</p>
          <p className="text-sm text-white/70">{playbackError}</p>
          <button
            type="button"
            onClick={() => onRetry(video.id)}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
          >
            <RefreshCcw size={16} />
            Thử lại
          </button>
        </div>
      ) : null}

    </div>
  )
}

export default function BuyerVideosPage() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [playbackById, setPlaybackById] = useState<Record<string, PlaybackState>>({})
  const [productById, setProductById] = useState<Record<string, Product>>({})
  const [productLoadingById, setProductLoadingById] = useState<Record<string, boolean>>({})

  const pageRef = useRef(1)
  const loadingRef = useRef(false)
  const hasMoreRef = useRef(true)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const playbackStateRef = useRef<Record<string, PlaybackState>>({})
  const productCacheRef = useRef<Record<string, Product>>({})
  const productLoadingRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    playbackStateRef.current = playbackById
  }, [playbackById])

  const loadProduct = useCallback(async (productId: string) => {
    if (!productId) return
    if (productCacheRef.current[productId]) return
    if (productLoadingRef.current.has(productId)) return

    productLoadingRef.current.add(productId)
    setProductLoadingById((prev) => ({ ...prev, [productId]: true }))

    try {
      const response = await api.product.get(productId)
      if (response.error) {
        logDebug("Product fetch error", { productId, error: response.error })
        // Mark as null to indicate error state
        productCacheRef.current[productId] = null as any
        setProductById((prev) => ({ ...prev, [productId]: null as any }))
        return
      }
      if (response.data) {
        productCacheRef.current[productId] = response.data
        setProductById((prev) => ({ ...prev, [productId]: response.data as Product }))
      }
    } catch (err) {
      logDebug("Product fetch error", { productId, error: err })
      productCacheRef.current[productId] = null as any
      setProductById((prev) => ({ ...prev, [productId]: null as any }))
    } finally {
      productLoadingRef.current.delete(productId)
      setProductLoadingById((prev) => ({ ...prev, [productId]: false }))
    }
  }, [])

  const loadVideos = useCallback(async (page: number) => {
    const isReset = page === 1
    if (loadingRef.current || (!hasMoreRef.current && !isReset)) return
    if (isReset) {
      hasMoreRef.current = true
      setHasMore(true)
      setPlaybackById({})
      setActiveVideoId(null)
    }
    logDebug("Load videos", { page })
    loadingRef.current = true
    setLoading(true)
    setError(null)

    try {
      const query = new URLSearchParams({
        limit: String(PAGE_LIMIT),
        page: String(page),
      })
      const requestUrl = `${API_BASE_URL}/api/v1/media/video?${query}`
      logDebug("Fetch video list", requestUrl)
      const response = await fetch(requestUrl, {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const payload = await response.json()
      const rawVideos = payload?.data?.videos ?? payload?.data ?? payload?.videos ?? []
      const incoming = Array.isArray(rawVideos) ? rawVideos : []
      logDebug("Video list loaded", { count: incoming.length })

      setVideos((prev) => {
        if (page === 1) return incoming
        const seen = new Set(prev.map((item) => item.id))
        const merged = [...prev]
        incoming.forEach((item) => {
          if (!seen.has(item.id)) {
            merged.push(item)
            seen.add(item.id)
          }
        })
        return merged
      })

      pageRef.current = page
      const nextHasMore = incoming.length >= PAGE_LIMIT
      hasMoreRef.current = nextHasMore
      setHasMore(nextHasMore)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tải danh sách video"
      logDebug("Video list error", message)
      setError(message)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [])

  const loadPlayback = useCallback(async (videoId: string) => {
    const existing = playbackStateRef.current[videoId]
    if (existing?.status === "loading" || existing?.status === "ready") return

    setPlaybackById((prev) => ({
      ...prev,
      [videoId]: { status: "loading" },
    }))

    try {
      const requestUrl = `${API_BASE_URL}/api/v1/media/playback?videoId=${encodeURIComponent(videoId)}`
      logDebug("Fetch playback", { videoId, requestUrl })
      const response = await fetch(requestUrl, { credentials: "include" })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const payload = await response.json()
      const data = payload?.data ?? payload
      if (!data?.manifestUrl) {
        throw new Error("Thiếu URL phát video")
      }
      if (!data?.playbackToken) {
        throw new Error("Thiếu token phát video")
      }
      logDebug("Playback data", {
        videoId,
        manifestUrl: data.manifestUrl,
        hasToken: Boolean(data.playbackToken),
      })

      setPlaybackById((prev) => ({
        ...prev,
        [videoId]: {
          status: "ready",
          info: {
            manifestUrl: data.manifestUrl,
            thumbnailUrl: data.thumbnailUrl,
            playbackToken: data.playbackToken,
            expiresAt: data.expiresAt,
          },
        },
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tải video"
      logDebug("Playback error", { videoId, message })
      setPlaybackById((prev) => ({
        ...prev,
        [videoId]: { status: "error", error: message },
      }))
    }
  }, [])

  useEffect(() => {
    loadVideos(1)
  }, [loadVideos])

  useEffect(() => {
    const ids = new Set<string>()
    videos.forEach((video) => {
      if (video.productId) ids.add(video.productId)
    })
    ids.forEach((id) => {
      if (!productCacheRef.current[id]) {
        loadProduct(id)
      }
    })
  }, [loadProduct, videos])

  useEffect(() => {
    if (!activeVideoId && videos.length > 0) {
      setActiveVideoId(videos[0].id)
    }
  }, [activeVideoId, videos])

  useEffect(() => {
    if (activeVideoId) {
      logDebug("Active video", activeVideoId)
    }
  }, [activeVideoId])

  useEffect(() => {
    if (!activeVideoId) return
    const activeVideo = videos.find((item) => item.id === activeVideoId)
    if (!activeVideo) return
    if (activeVideo.status && activeVideo.status !== "READY") return
    loadPlayback(activeVideoId)
  }, [activeVideoId, videos, loadPlayback])

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const container = event.currentTarget
      const height = container.clientHeight
      if (!height) return

      const index = Math.round(container.scrollTop / height)
      const current = videos[index]
      if (current && current.id !== activeVideoId) {
        setActiveVideoId(current.id)
      }

      if (
        !loadingRef.current &&
        hasMoreRef.current &&
        container.scrollTop + height >= container.scrollHeight - height * 1.5
      ) {
        loadVideos(pageRef.current + 1)
      }
    },
    [activeVideoId, loadVideos, videos]
  )

  return (
    <div className="bg-black text-white">
      <div className="w-full">
        {videos.length === 0 && loading ? (
          <div className={`${viewHeightClass} flex flex-col items-center justify-center`}>
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
            <p className="mt-4 text-sm text-white/70">Đang tải video...</p>
          </div>
        ) : null}

        {videos.length === 0 && !loading ? (
          <div className={`${viewHeightClass} flex flex-col items-center justify-center text-center`}>
            <p className="text-lg font-semibold">Chưa có video</p>
            {error ? <p className="mt-2 text-sm text-white/60">{error}</p> : null}
            <button
              type="button"
              onClick={() => loadVideos(1)}
              className="mt-4 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              Tải lại
            </button>
          </div>
        ) : null}

        {videos.length > 0 ? (
          <div className="relative">
            <div
              ref={containerRef}
              className={`${viewHeightClass} snap-y snap-mandatory overflow-y-auto scroll-smooth hide-scrollbar`}
              onScroll={handleScroll}
            >
              {videos.map((video) => (
                <VideoSlide
                  key={video.id}
                  video={video}
                  playback={playbackById[video.id]}
                  isActive={video.id === activeVideoId}
                  onRetry={loadPlayback}
                  product={video.productId ? productById[video.productId] : undefined}
                  productLoading={video.productId ? productLoadingById[video.productId] : false}
                />
              ))}
            </div>

            {loading && videos.length > 0 ? (
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center text-sm text-white/70">
                Đang tải thêm video...
              </div>
            ) : null}

            {!hasMore && videos.length > 0 ? (
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center text-sm text-white/60">
                Bạn đã xem hết video
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
