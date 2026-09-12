from pydantic import BaseModel
from typing import List, Optional

class SubtitleTrack(BaseModel):
    id: str
    label: str
    lang: str
    src: str

class MovieCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    posterUrl: Optional[str] = ""
    backdropUrl: Optional[str] = ""
    trailerUrl: Optional[str] = ""
    videoUrl: str
    releaseYear: Optional[int] = 2026
    rating: Optional[float] = 8.5
    duration: Optional[str] = "2h 00m"
    type: str = "movie" # 'movie' or 'series'
    genres: List[str] = []
    isFeatured: Optional[bool] = False
    isTrending: Optional[bool] = False
    isPopular: Optional[bool] = False
    isLatest: Optional[bool] = True
    isPublished: Optional[bool] = True
    cast: List[str] = []
    director: Optional[str] = ""
    uploadedByUserId: Optional[str] = None
    uploadedByUserName: Optional[str] = None
    uploadedByAvatar: Optional[str] = None
    approvalStatus: Optional[str] = "approved"
    rejectionReason: Optional[str] = None

class MovieResponse(MovieCreate):
    id: str
    views: int = 0
    createdAt: str
    subtitles: List[SubtitleTrack] = []

class EpisodeCreate(BaseModel):
    seriesId: str
    seasonNumber: int
    episodeNumber: int
    title: str
    description: Optional[str] = ""
    duration: Optional[str] = "45m"
    videoUrl: str
    thumbnailUrl: Optional[str] = ""

class EpisodeResponse(EpisodeCreate):
    id: str
    views: int = 0
    subtitles: List[SubtitleTrack] = []

class GenreCreate(BaseModel):
    name: str

class GenreResponse(BaseModel):
    id: str
    name: str
    slug: str
    count: int = 0

class UserLogin(BaseModel):
    email: str
    password: str
    role: Optional[str] = "USER"

class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    avatar: Optional[str] = None

class UserProfileUpdate(BaseModel):
    userId: str
    name: Optional[str] = None
    email: Optional[str] = None
    avatar: Optional[str] = None

class WatchHistoryItem(BaseModel):
    contentId: str
    contentType: str
    episodeId: Optional[str] = None
    progress: int
    duration: int
    currentTime: int

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    avatar: str
    role: str
    status: str
    createdAt: str
    favorites: List[str] = []
    history: List[dict] = []
