// app/profile/[username]/page.tsx
'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import ScriptCard from '@/components/ScriptCard'
import AvatarCropper from '@/components/AvatarCropper'

type Profile = {
  id: string
  username: string | null
  bio: string | null
  avatar_url: string | null
}

type Script = {
  id: string
  title: string
  logline: string | null
  genre: string | null
  created_at: string
  is_public?: boolean
}

export default function ProfilePage() {
  const params = useParams()
  const username = params?.username as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [publicScripts, setPublicScripts] = useState<Script[]>([])
  const [privateScripts, setPrivateScripts] = useState<Script[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!username) return

      // 1) Get profile for this username (including avatar_url)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, bio, avatar_url')
        .eq('username', username)
        .single()

      if (profileError || !profileData) {
        console.error('Profile load error:', profileError)
        setLoading(false)
        return
      }

      setProfile(profileData as Profile)

      // 2) Get current auth user and check ownership
      const { data: userData } = await supabase.auth.getUser()
      const authedUserId = userData?.user?.id ?? null
      const owner = authedUserId === profileData.id
      setIsOwner(!!owner)

      // 3) Public scripts
      const { data: publicData, error: publicError } = await supabase
        .from('scripts')
        .select('id, title, logline, genre, created_at, is_public')
        .eq('user_id', profileData.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      if (publicError) {
        console.error('Error loading public scripts:', publicError)
      }

      setPublicScripts((publicData as Script[]) || [])

      // 4) Private scripts (only if owner)
      if (owner) {
        const { data: allData, error: allError } = await supabase
          .from('scripts')
          .select('id, title, logline, genre, created_at, is_public')
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: false })

        if (allError) {
          console.error('Error loading all scripts:', allError)
        }

        if (allData) {
          const allScripts = allData as Script[]
          const priv = allScripts.filter((s) => !s.is_public)
          setPrivateScripts(priv)
        }
      }

      setLoading(false)
    }

    load()
  }, [username])

  // 🔹 When user picks a file: open cropper with preview image
  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !profile) return

    const reader = new FileReader()
    reader.onload = () => {
      setCropImageSrc(reader.result as string)
      setShowCropper(true)
    }
    reader.readAsDataURL(file)

    // reset input so picking same file again works
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 🔹 Upload the cropped avatar blob to Supabase
  const uploadCroppedAvatar = async (blob: Blob) => {
    if (!profile) return
    setAvatarUploading(true)

    try {
      const fileExt = 'jpg'
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          upsert: true,
          contentType: blob.type || 'image/jpeg',
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        alert(`Error uploading avatar: ${uploadError.message}`)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const publicUrl = publicUrlData.publicUrl

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)

      if (updateError) {
        console.error('Error saving avatar URL:', updateError)
        alert(`Error saving avatar URL: ${updateError.message}`)
        return
      }

      setProfile((prev) =>
        prev ? { ...prev, avatar_url: publicUrl } : prev
      )
    } finally {
      setAvatarUploading(false)
    }
  }

  // 🔹 Delete handler
  const handleDeleteProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || !profile || user.id !== profile.id) return

    const ok = window.confirm(
      'Delete your profile and sign out? This may remove your presence from the platform.'
    )
    if (!ok) return

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id)

    if (error) {
      console.error('Error deleting profile:', error)
      alert('Could not delete your profile. Please try again.')
      return
    }

    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white px-6 py-10">
        <p className="text-sm text-slate-400">Loading profile...</p>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-black text-white px-6 py-10">
        <p className="text-sm text-red-400">Profile not found.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10 space-y-6">
      {/* Header */}
      <div className="border border-slate-800 rounded-xl p-4 flex gap-4 items-start">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.username || 'avatar'}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-slate-400">no photo</span>
            )}
          </div>

          {isOwner && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer text-[0.65rem] border border-slate-700 px-2 py-1 rounded-full hover:bg-slate-800 transition disabled:opacity-60"
                disabled={avatarUploading}
              >
                {avatarUploading ? 'Saving…' : 'Update photo'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </>
          )}
        </div>

        {/* Text area */}
        <div className="flex-1">
          <h1 className="text-xl font-semibold">
            @{profile.username || 'unnamed'}
          </h1>

          {profile.bio && (
            <p className="mt-1 text-sm text-slate-300">{profile.bio}</p>
          )}

          {isOwner && (
            <>
              <p className="mt-2 text-[0.7rem] text-slate-500">
                This is your public profile. Only you can see your private drafts below.
              </p>
              <button
                onClick={handleDeleteProfile}
                className="cursor-pointer mt-3 text-xs text-red-400 border border-red-500 px-3 py-1 rounded-full hover:bg-red-500 hover:text-white transition"
              >
                Delete Profile
              </button>
            </>
          )}
        </div>
      </div>

      {/* Public scripts */}
      <section>
        <h2 className="text-sm font-semibold mb-2">Public script</h2>
        {publicScripts.length === 0 ? (
          <p className="text-xs text-slate-500">No public scripts yet.</p>
        ) : (
          <div className="grid gap-3">
            {publicScripts.map((s) => (
              <ScriptCard
                key={s.id}
                id={s.id}
                title={s.title}
                logline={s.logline}
                genre={s.genre}
                created_at={s.created_at}
              />
            ))}
          </div>
        )}
      </section>

      {/* Private drafts */}
      {isOwner && (
        <section>
          <h2 className="text-sm font-semibold mb-2">Your private drafts</h2>
          {privateScripts.length === 0 ? (
            <p className="text-xs text-slate-500">
              You don’t have any private drafts yet. Upload a script and keep it
              private until you’re ready.
            </p>
          ) : (
            <div className="grid gap-3">
              {privateScripts.map((s) => (
                <ScriptCard
                  key={s.id}
                  id={s.id}
                  title={s.title}
                  logline={s.logline}
                  genre={s.genre}
                  created_at={s.created_at}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Avatar crop overlay */}
      {showCropper && cropImageSrc && (
        <AvatarCropper
          imageSrc={cropImageSrc}
          onCancel={() => {
            setShowCropper(false)
            setCropImageSrc(null)
          }}
          onComplete={async (blob) => {
            await uploadCroppedAvatar(blob)
            setShowCropper(false)
            setCropImageSrc(null)
          }}
        />
      )}
    </main>
  )
}
