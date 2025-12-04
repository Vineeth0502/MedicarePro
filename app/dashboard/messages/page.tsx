"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Send, Search, MessageSquare, MoreVertical, Trash2, Smile, Plus, Image as ImageIcon, FileText, X, Check, CheckCheck } from "lucide-react"
import { messagesAPI, usersAPI } from "@/lib/api"
import { format } from "date-fns"
import { getBackendBaseUrl } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export default function MessagesPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [messageText, setMessageText] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [otherUsers, setOtherUsers] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showAllUsers, setShowAllUsers] = useState(false)
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null)
  const [reactingMessageId, setReactingMessageId] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastMessageTimestampRef = useRef<string | null>(null)
  const lastConversationUpdateRef = useRef<number>(0)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user')
      if (userData) {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
      } else {
        router.push('/login')
      }

      // Check for userId in URL query params
      const urlParams = new URLSearchParams(window.location.search)
      const userId = urlParams.get('userId')
      if (userId) {
        setSelectedConversation(userId)
        // Remove query param from URL
        window.history.replaceState({}, '', '/dashboard/messages')
      }
    }
    loadConversations()
    
    // Poll for new conversations every 15 seconds (less frequent, silent updates)
    const conversationsInterval = setInterval(() => {
      loadConversations(true) // Silent update
    }, 15000)
    
    return () => clearInterval(conversationsInterval)
  }, [router])

  // Load other users when user is set
  useEffect(() => {
    if (user) {
      loadOtherUsers()
    }
  }, [user])

  useEffect(() => {
    if (selectedConversation && user) {
      // Reset timestamp ref when conversation changes
      lastMessageTimestampRef.current = null
      loadMessages(selectedConversation)
      // Poll for new messages every 8 seconds (less frequent to reduce load)
      const interval = setInterval(() => {
        loadMessagesSilently(selectedConversation)
      }, 8000)
      return () => clearInterval(interval)
    }
  }, [selectedConversation, user])

  const loadConversations = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true)
      }
      const res = await messagesAPI.getConversations()
      const conversationsData = res.data.data?.conversations || []
      const newConversations = Array.isArray(conversationsData) ? conversationsData : []
      
      // Only update if conversations actually changed (compare unread counts and last messages)
      const hasChanged = conversations.length !== newConversations.length ||
        conversations.some((conv: any, idx: number) => {
          const newConv = newConversations[idx]
          return !newConv || 
                 conv.unreadCount !== newConv.unreadCount ||
                 conv.lastMessage?.content !== newConv.lastMessage?.content
        })
      
      if (hasChanged) {
        setConversations(newConversations)
      }
    } catch (error) {
      if (!silent) {
        console.error('Error loading conversations:', error)
        setConversations([])
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  const loadOtherUsers = async () => {
    try {
      if (!user) return
      
      // Load all users that the current user can message
      // For patients: show doctors/providers
      // For doctors/providers: show both patients AND other doctors/providers
      let allUsers: any[] = []
      
      if (user.role === 'patient') {
        // Patients can only message doctors/providers
        const res = await usersAPI.getPatients({ role: 'provider' }) // No limit - get all
        const usersData = res.data.data?.patients || res.data.data?.users || res.data.data || []
        allUsers = Array.isArray(usersData) ? usersData : []
      } else if (user.role === 'provider' || user.role === 'doctor') {
        // Doctors/providers can message both patients AND other doctors/providers
        try {
          // Load patients
          const patientsRes = await usersAPI.getPatients({ role: 'patient' }) // No limit - get all
          const patientsData = patientsRes.data.data?.patients || patientsRes.data.data?.users || patientsRes.data.data || []
          const patientsArray = Array.isArray(patientsData) ? patientsData : []
          allUsers.push(...patientsArray)
        } catch (error) {
          console.error('Error loading patients:', error)
        }
        
        try {
          // Load other doctors/providers
          const providersRes = await usersAPI.getPatients({ role: 'provider' }) // No limit - get all
          const providersData = providersRes.data.data?.patients || providersRes.data.data?.users || providersRes.data.data || []
          const providersArray = Array.isArray(providersData) ? providersData : []
          allUsers.push(...providersArray)
        } catch (error) {
          console.error('Error loading providers:', error)
        }
      } else {
        // For admin or other roles, show all users
        const res = await usersAPI.getPatients() // No limit - get all
        const usersData = res.data.data?.patients || res.data.data?.users || res.data.data || []
        allUsers = Array.isArray(usersData) ? usersData : []
      }
      
      // Filter out the current user and remove duplicates
      const uniqueUsers = new Map()
      allUsers.forEach((u: any) => {
        if (u._id !== user._id && !uniqueUsers.has(u._id)) {
          uniqueUsers.set(u._id, u)
        }
      })
      
      const filteredUsers = Array.from(uniqueUsers.values())
      
      setOtherUsers(filteredUsers)
      console.log('Loaded other users:', filteredUsers.length, 'for role:', user.role)
    } catch (error) {
      console.error('Error loading users:', error)
      setOtherUsers([])
    }
  }

  const handleClearChat = async () => {
    if (!selectedConversation) return
    
    try {
      setDeleting(true)
      const response = await messagesAPI.clearConversation(selectedConversation)
      console.log('Clear chat response:', response.data)
      setMessages([])
      setSelectedConversation(null)
      await loadConversations()
      setShowDeleteDialog(false)
    } catch (error: any) {
      console.error('Error clearing chat:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to clear chat. Please try again.'
      toast.error('Error', {
        description: errorMessage
      })
    } finally {
      setDeleting(false)
    }
  }

  const getSenderName = (message: any) => {
    if (message.senderId) {
      if (typeof message.senderId === 'object') {
        const name = `${message.senderId.firstName || ''} ${message.senderId.lastName || ''}`.trim()
        // Add Dr. prefix for doctors/providers only if not already present
        if (name && (message.senderId.role === 'doctor' || message.senderId.role === 'provider')) {
          // Check if name already starts with Dr. or Dr (case insensitive)
          if (!name.match(/^Dr\.?\s+/i)) {
            return `Dr. ${name}`
          }
          return name
        }
        return name || message.senderId.email || message.senderId.username || 'User'
      }
    }
    return 'User'
  }

  const getSenderInitials = (message: any) => {
    const name = getSenderName(message)
    return getInitials(name)
  }

  const loadMessages = async (userId: string, silent = false) => {
    try {
      const res = await messagesAPI.getMessages({ userId, limit: 100 })
      const messagesData = res.data.data?.messages || res.data.data || []
      const newMessages = Array.isArray(messagesData) ? messagesData.reverse() : []
      
      // Check if there are actually new messages by comparing the latest message timestamp
      if (silent && newMessages.length > 0) {
        const latestMessage = newMessages[newMessages.length - 1]
        const latestTimestamp = latestMessage?.createdAt || latestMessage?._id
        
        // Only update if we have a new message (different timestamp than last check)
        if (lastMessageTimestampRef.current === latestTimestamp) {
          return // No new messages, skip update
        }
        lastMessageTimestampRef.current = latestTimestamp
      }
      
      // Only update state if messages actually changed
      if (messages.length !== newMessages.length || 
          (messages.length > 0 && newMessages.length > 0 && 
           messages[messages.length - 1]?._id !== newMessages[newMessages.length - 1]?._id)) {
        setMessages(newMessages)
      }
      
      // Mark all unread messages as read when conversation is opened (only on initial load, not on polling)
      if (!silent && user && userId) {
        try {
          await messagesAPI.markConversationAsRead(userId)
          // Only reload conversations if we haven't done so recently (prevent spam)
          const now = Date.now()
          if (now - lastConversationUpdateRef.current > 2000) {
            lastConversationUpdateRef.current = now
            await loadConversations()
          }
        } catch (error) {
          console.error('Error marking messages as read:', error)
        }
      }
    } catch (error) {
      if (!silent) {
        console.error('Error loading messages:', error)
        setMessages([])
      }
    }
  }

  const loadMessagesSilently = async (userId: string) => {
    await loadMessages(userId, true)
  }

  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      const response = await messagesAPI.addReaction(messageId, emoji)
      console.log('Reaction response:', response.data)
      // Reload messages to get updated reactions
      if (selectedConversation) {
        await loadMessages(selectedConversation)
      }
      setReactingMessageId(null)
    } catch (error: any) {
      console.error('Error adding reaction:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      })
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add reaction. Please try again.'
      toast.error('Error', {
        description: errorMessage
      })
    }
  }

  const getReactionCount = (message: any, emoji: string) => {
    if (!message.reactions || !Array.isArray(message.reactions)) return 0
    return message.reactions.filter((r: any) => r.emoji === emoji).length
  }

  const hasUserReacted = (message: any, emoji: string) => {
    if (!message.reactions || !Array.isArray(message.reactions) || !user) return false
    return message.reactions.some((r: any) => 
      r.emoji === emoji && 
      (r.userId?._id?.toString() === user._id?.toString() || 
       r.userId?.toString() === user._id?.toString() ||
       (typeof r.userId === 'string' && r.userId === user._id))
    )
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File Too Large', {
          description: 'File size must be less than 10MB'
        })
        return
      }
      setSelectedFile(file)
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedConversation || uploadingFile) return

    try {
      setUploadingFile(true)
      await messagesAPI.uploadFile(selectedFile, selectedConversation, messageText.trim() || undefined)
      setSelectedFile(null)
      setMessageText("")
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      await loadMessages(selectedConversation)
      await loadConversations()
    } catch (error: any) {
      console.error('Error uploading file:', error)
      const errorMessage = error.response?.data?.message || 'Failed to upload file. Please try again.'
      toast.error('Error', {
        description: errorMessage
      })
    } finally {
      setUploadingFile(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || !selectedConversation || sending) return

    try {
      setSending(true)
      await messagesAPI.sendMessage({
        receiverId: selectedConversation,
        content: messageText.trim(),
      })
      setMessageText("")
      await loadMessages(selectedConversation)
      await loadConversations()
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Error', {
        description: 'Failed to send message. Please try again.'
      })
    } finally {
      setSending(false)
    }
  }

  const getOtherUserName = (conversation: any) => {
    if (conversation.userName) {
      // Check if the user is a doctor/provider and add Dr. prefix only if not already present
      const u = conversation.user || {}
      if ((u.role === 'doctor' || u.role === 'provider') && conversation.userName) {
        const name = conversation.userName.trim()
        // Check if name already starts with Dr. or Dr (case insensitive)
        if (!name.match(/^Dr\.?\s+/i)) {
          return `Dr. ${name}`
        }
        return name
      }
      return conversation.userName
    }
    if (conversation.user) {
      const u = conversation.user
      const name = `${u.firstName || ''} ${u.lastName || ''}`.trim()
      // Add Dr. prefix for doctors/providers only if not already present
      if (name && (u.role === 'doctor' || u.role === 'provider')) {
        // Check if name already starts with Dr. or Dr (case insensitive)
        if (!name.match(/^Dr\.?\s+/i)) {
          return `Dr. ${name}`
        }
        return name
      }
      return name || u.email || 'User'
    }
    return 'User'
  }

  const getOtherUserEmail = (conversation: any) => {
    if (conversation.userEmail) {
      return conversation.userEmail
    }
    if (conversation.user) {
      return conversation.user.email || ''
    }
    return ''
  }

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const getUserName = (userObj: any) => {
    if (userObj.firstName && userObj.lastName) {
      const name = `${userObj.firstName} ${userObj.lastName}`.trim()
      // Add Dr. prefix for doctors/providers only if not already present
      if (userObj.role === 'doctor' || userObj.role === 'provider') {
        // Check if name already starts with Dr. or Dr (case insensitive)
        if (!name.match(/^Dr\.?\s+/i)) {
          return `Dr. ${name}`
        }
        return name
      }
      return name
    }
    return userObj.username || userObj.email || 'User'
  }

  const getUserInitials = (userObj: any) => {
    const name = getUserName(userObj)
    return getInitials(name)
  }

  // Show all users in "New Chat" - they can start new conversations or continue existing ones
  // If you want to show only users without conversations, uncomment the filter below
  const availableUsers = otherUsers
  // Uncomment to show only users without existing conversations:
  // const availableUsers = otherUsers.filter((u) => {
  //   return !conversations.some((c) => c.userId === u._id)
  // })

  const filteredConversations = conversations.filter((conv) => {
    if (searchTerm === "") return true
    const name = getOtherUserName(conv).toLowerCase()
    const email = getOtherUserEmail(conv).toLowerCase()
    return name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase())
  })

  const filteredAvailableUsers = availableUsers.filter((u) => {
    if (searchTerm === "") return true
    const name = getUserName(u).toLowerCase()
    const email = (u.email || '').toLowerCase()
    return name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase())
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <MessageSquare className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Conversations List */}
      <Card className="w-80 flex flex-col h-full overflow-hidden">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between mb-2">
            <CardTitle>Messages</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllUsers(!showAllUsers)}
            >
              {showAllUsers ? 'Conversations' : 'New Chat'}
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={showAllUsers ? "Search people..." : "Search conversations..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400" style={{ scrollbarWidth: 'thin', maxHeight: '100%' }}>
          {showAllUsers ? (
            // Show all available users to start new conversations
            <div className="space-y-1">
              {filteredAvailableUsers.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {otherUsers.length === 0 ? (
                    <div>
                      <p className="mb-2">No users available to chat with.</p>
                      <p className="text-xs">
                        {user?.role === 'patient' 
                          ? 'No doctors or providers found.' 
                          : user?.role === 'provider' || user?.role === 'doctor'
                          ? 'No patients found.'
                          : 'No users found.'}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p>No users match your search.</p>
                      <p className="text-xs mt-1">Try a different search term.</p>
                    </div>
                  )}
                </div>
              ) : (
                filteredAvailableUsers.map((userObj) => {
                  const userName = getUserName(userObj)
                  const initials = getUserInitials(userObj)
                  const isSelected = selectedConversation === userObj._id

                  return (
                    <div
                      key={userObj._id}
                      onClick={() => setSelectedConversation(userObj._id)}
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                        isSelected ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src="/placeholder-user.jpg" alt={userName} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{userName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {userObj.email}
                          </p>
                          {userObj.profile && (
                            <p className="text-xs text-muted-foreground truncate">
                              {userObj.role === 'provider' || userObj.role === 'doctor' 
                                ? 'Doctor' 
                                : 'Patient'}
                            </p>
                          )}
                        </div>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          ) : (
            // Show existing conversations
            <div className="space-y-1">
              {filteredConversations.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No conversations yet. Click "New Chat" to start messaging.
                </div>
              ) : (
                filteredConversations.map((conversation) => {
                  const otherUserName = getOtherUserName(conversation)
                  const initials = getInitials(otherUserName)
                  const isSelected = selectedConversation === conversation.userId
                  const unreadCount = conversation.unreadCount || 0

                  return (
                    <div
                      key={conversation.userId}
                      onClick={() => setSelectedConversation(conversation.userId)}
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                        isSelected ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src="/placeholder-user.jpg" alt={otherUserName} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{otherUserName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {conversation.lastMessage?.content || 'No messages yet'}
                          </p>
                        </div>
                        {unreadCount > 0 && (
                          <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center">
                            {unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages Area */}
      <Card className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {selectedConversation ? (
          <>
            <CardHeader className="flex flex-row items-center justify-between border-b flex-shrink-0">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/placeholder-user.jpg" alt={getOtherUserName(
                    conversations.find((c) => c.userId === selectedConversation) || 
                    otherUsers.find((u) => u._id === selectedConversation) || {}
                  )} />
                  <AvatarFallback>
                    {getInitials(getOtherUserName(
                      conversations.find((c) => c.userId === selectedConversation) || 
                      otherUsers.find((u) => u._id === selectedConversation) || {}
                    ))}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">
                    {getOtherUserName(
                      conversations.find((c) => c.userId === selectedConversation) || 
                      otherUsers.find((u) => u._id === selectedConversation) || {}
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {getOtherUserEmail(
                      conversations.find((c) => c.userId === selectedConversation) || 
                      otherUsers.find((u) => u._id === selectedConversation) || {}
                    )}
                  </CardDescription>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Chat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 bg-gray-100 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 min-h-0">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((message, index) => {
                    // Check if message is from current user
                    // Extract sender ID - handle all possible formats
                    let senderIdStr: string | null = null
                    
                    if (message.senderId) {
                      if (typeof message.senderId === 'object' && message.senderId !== null) {
                        // Populated senderId object
                        senderIdStr = message.senderId._id ? String(message.senderId._id).trim() : null
                        // Also check if it's just an object with toString
                        if (!senderIdStr && message.senderId.toString) {
                          senderIdStr = String(message.senderId).trim()
                        }
                      } else if (typeof message.senderId === 'string') {
                        // String senderId
                        senderIdStr = message.senderId.trim()
                      }
                    }
                    
                    // Get current user ID as string - handle both _id and id
                    let currentUserIdStr: string | null = null
                    if (user) {
                      if (user._id) {
                        currentUserIdStr = String(user._id).trim()
                      } else if (user.id) {
                        currentUserIdStr = String(user.id).trim()
                      }
                    }
                    
                    // Compare IDs - normalize and compare
                    let isOwnMessage = false
                    if (senderIdStr && currentUserIdStr) {
                      // Direct comparison
                      isOwnMessage = senderIdStr === currentUserIdStr
                      // If not equal, try lowercase comparison
                      if (!isOwnMessage) {
                        isOwnMessage = senderIdStr.toLowerCase() === currentUserIdStr.toLowerCase()
                      }
                      // Also try comparing just the last part (MongoDB IDs can have different formats)
                      if (!isOwnMessage) {
                        const senderIdLast = senderIdStr.split('"').pop() || senderIdStr
                        const currentIdLast = currentUserIdStr.split('"').pop() || currentUserIdStr
                        isOwnMessage = senderIdLast === currentIdLast || senderIdLast.toLowerCase() === currentIdLast.toLowerCase()
                      }
                    }
                    
                    // Debug log for troubleshooting
                    if (index < 3) {
                      console.log(`Message ${index} alignment:`, {
                        senderId: senderIdStr,
                        currentUserId: currentUserIdStr,
                        isOwnMessage,
                        messagePreview: message.content?.substring(0, 30),
                        senderIdType: typeof message.senderId,
                        userType: typeof user?._id
                      })
                    }
                    
                    // Check if we should show sender info (new sender or time gap)
                    const prevMessage = index > 0 ? messages[index - 1] : null
                    const showSenderInfo = !isOwnMessage && (
                      !prevMessage || 
                      prevMessage.senderId?._id !== message.senderId?._id ||
                      (typeof prevMessage.senderId === 'string' && prevMessage.senderId !== message.senderId) ||
                      new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 300000 // 5 minutes
                    )
                    
                    // Common emoji reactions
                    const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏']
                    const messageReactions = message.reactions || []
                    
                    // WhatsApp-style: Sent messages RIGHT (blue), Received messages LEFT (white)
                    if (isOwnMessage) {
                      // YOUR MESSAGE - Right side, blue bubble
                      return (
                        <div
                          key={message._id || index}
                          className="flex justify-end mb-1 px-2 group"
                          onMouseEnter={() => setHoveredMessage(message._id)}
                          onMouseLeave={() => setHoveredMessage(null)}
                        >
                          <div className="max-w-[75%] relative">
                            <div className="bg-blue-500 text-white px-3 py-1.5 rounded-lg rounded-br-none inline-block shadow-sm">
                              {/* Display attachments */}
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mb-2 space-y-2">
                                  {message.attachments.map((attachment: any, idx: number) => {
                                    const isImage = attachment.fileType?.startsWith('image/')
                                    const fileUrl = attachment.fileUrl?.startsWith('http') 
                                      ? attachment.fileUrl 
                                      : `${getBackendBaseUrl()}${attachment.fileUrl}`
                                    
                                    return (
                                      <div key={idx} className="rounded overflow-hidden">
                                        {isImage ? (
                                          <img 
                                            src={fileUrl} 
                                            alt={attachment.fileName || 'Image'} 
                                            className="max-w-[300px] max-h-[300px] object-contain rounded cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => setPreviewImage(fileUrl)}
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).src = '/placeholder.jpg'
                                            }}
                                          />
                                        ) : (
                                          <a 
                                            href={fileUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-white text-sm"
                                          >
                                            <FileText className="h-4 w-4" />
                                            <span className="truncate max-w-[200px]">{attachment.fileName || 'Document'}</span>
                                          </a>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                              <p className="text-sm break-words text-white leading-relaxed">
                                {message.content}
                              </p>
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <p className="text-xs text-blue-100">
                                  {format(new Date(message.createdAt), 'h:mm a')}
                                </p>
                                {/* Read receipt */}
                                {message.isRead ? (
                                  <CheckCheck className="h-3 w-3 text-blue-200" />
                                ) : (
                                  <Check className="h-3 w-3 text-blue-200" />
                                )}
                                {hoveredMessage === message._id && (
                                  <Popover open={reactingMessageId === message._id} onOpenChange={(open) => setReactingMessageId(open ? message._id : null)}>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 opacity-70 hover:opacity-100"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setReactingMessageId(message._id)
                                        }}
                                      >
                                        <Smile className="h-3 w-3 text-blue-100" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-2" align="end">
                                      <div className="flex gap-1">
                                        {commonEmojis.map((emoji) => (
                                          <button
                                            key={emoji}
                                            onClick={() => handleAddReaction(message._id, emoji)}
                                            className={`px-2 py-1 rounded hover:bg-gray-100 text-lg transition-colors ${
                                              hasUserReacted(message, emoji) ? 'bg-blue-50' : ''
                                            }`}
                                          >
                                            {emoji}
                                          </button>
                                        ))}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </div>
                            </div>
                            {messageReactions.length > 0 && (
                              <div className="flex gap-1 mt-1 justify-end flex-wrap">
                                {Array.from(new Set(messageReactions.map((r: any) => r.emoji)) as Set<string>).map((emoji: string) => {
                                  const count = getReactionCount(message, emoji)
                                  const userReacted = hasUserReacted(message, emoji)
                                  return (
                                    <button
                                      key={emoji}
                                      onClick={() => handleAddReaction(message._id, emoji)}
                                      className={`px-2 py-0.5 rounded-full text-xs border ${
                                        userReacted
                                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                      }`}
                                    >
                                      <span className="mr-1">{emoji}</span>
                                      <span>{count}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    } else {
                      // RECEIVED MESSAGE - Left side, white bubble with avatar
                      return (
                        <div
                          key={message._id || index}
                          className="flex justify-start mb-1 px-2 gap-2 group"
                          onMouseEnter={() => setHoveredMessage(message._id)}
                          onMouseLeave={() => setHoveredMessage(null)}
                        >
                          {showSenderInfo ? (
                            <Avatar className="h-6 w-6 flex-shrink-0 mt-auto">
                              <AvatarImage src="/placeholder-user.jpg" alt={getSenderName(message)} />
                              <AvatarFallback className="text-xs bg-gray-300 text-gray-700">
                                {getSenderInitials(message)}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-6 flex-shrink-0" />
                          )}
                          <div className="max-w-[75%] relative">
                            {showSenderInfo && (
                              <p className="text-xs text-gray-600 mb-0.5 px-1 font-medium">
                                {getSenderName(message)}
                              </p>
                            )}
                            <div className="bg-white text-gray-900 px-3 py-1.5 rounded-lg rounded-bl-none inline-block shadow-sm border border-gray-200">
                              {/* Display attachments */}
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mb-2 space-y-2">
                                  {message.attachments.map((attachment: any, idx: number) => {
                                    const isImage = attachment.fileType?.startsWith('image/')
                                    const fileUrl = attachment.fileUrl?.startsWith('http') 
                                      ? attachment.fileUrl 
                                      : `${getBackendBaseUrl()}${attachment.fileUrl}`
                                    
                                    return (
                                      <div key={idx} className="rounded overflow-hidden">
                                        {isImage ? (
                                          <img 
                                            src={fileUrl} 
                                            alt={attachment.fileName || 'Image'} 
                                            className="max-w-[300px] max-h-[300px] object-contain rounded cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => setPreviewImage(fileUrl)}
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).src = '/placeholder.jpg'
                                            }}
                                          />
                                        ) : (
                                          <a 
                                            href={fileUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-gray-900 text-sm border border-gray-300"
                                          >
                                            <FileText className="h-4 w-4" />
                                            <span className="truncate max-w-[200px]">{attachment.fileName || 'Document'}</span>
                                          </a>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                              <p className="text-sm break-words text-gray-900 leading-relaxed">
                                {message.content}
                              </p>
                              <div className="flex items-center justify-start gap-2 mt-1">
                                <p className="text-xs text-gray-500">
                                  {format(new Date(message.createdAt), 'h:mm a')}
                                </p>
                                {hoveredMessage === message._id && (
                                  <Popover open={reactingMessageId === message._id} onOpenChange={(open) => setReactingMessageId(open ? message._id : null)}>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 opacity-70 hover:opacity-100"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setReactingMessageId(message._id)
                                        }}
                                      >
                                        <Smile className="h-3 w-3 text-gray-500" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-2" align="start">
                                      <div className="flex gap-1">
                                        {commonEmojis.map((emoji) => (
                                          <button
                                            key={emoji}
                                            onClick={() => handleAddReaction(message._id, emoji)}
                                            className={`px-2 py-1 rounded hover:bg-gray-100 text-lg transition-colors ${
                                              hasUserReacted(message, emoji) ? 'bg-blue-50' : ''
                                            }`}
                                          >
                                            {emoji}
                                          </button>
                                        ))}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </div>
                            </div>
                            {messageReactions.length > 0 && (
                              <div className="flex gap-1 mt-1 justify-start flex-wrap">
                                {Array.from(new Set(messageReactions.map((r: any) => r.emoji)) as Set<string>).map((emoji: string) => {
                                  const count = getReactionCount(message, emoji)
                                  const userReacted = hasUserReacted(message, emoji)
                                  return (
                                    <button
                                      key={emoji}
                                      onClick={() => handleAddReaction(message._id, emoji)}
                                      className={`px-2 py-0.5 rounded-full text-xs border ${
                                        userReacted
                                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                      }`}
                                    >
                                      <span className="mr-1">{emoji}</span>
                                      <span>{count}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    }
                  })
                )}
              </div>
              {/* Selected file preview */}
              {selectedFile && (
                <div className="px-4 pt-2 border-t bg-gray-50 flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2 flex-1">
                    {selectedFile.type.startsWith('image/') ? (
                      <ImageIcon className="h-4 w-4 text-blue-500" />
                    ) : (
                      <FileText className="h-4 w-4 text-blue-500" />
                    )}
                    <span className="text-sm text-gray-700 truncate">{selectedFile.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setSelectedFile(null)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleFileUpload}
                    disabled={uploadingFile || !selectedConversation}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                    size="sm"
                  >
                    {uploadingFile ? 'Uploading...' : 'Send'}
                  </Button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="p-4 border-t bg-white flex gap-2 flex-shrink-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending || uploadingFile}
                >
                  <Plus className="h-5 w-5" />
                </Button>
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-50 border-gray-200 focus:bg-white"
                  disabled={sending || uploadingFile}
                />
                <Button 
                  type="submit" 
                  disabled={sending || uploadingFile || !messageText.trim()}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Select a conversation to start messaging</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Delete Chat Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear this conversation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearChat}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? 'Clearing...' : 'Clear Chat'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black/95">
          <DialogHeader className="sr-only">
            <DialogTitle>Image Preview</DialogTitle>
            <DialogDescription>Preview of shared image</DialogDescription>
          </DialogHeader>
          {previewImage && (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <img 
                src={previewImage} 
                alt="Preview" 
                className="max-w-full max-h-[85vh] object-contain rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.jpg'
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setPreviewImage(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

