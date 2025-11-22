"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  HelpCircle, 
  Mail, 
  Phone, 
  MessageSquare, 
  Clock, 
  FileText, 
  BookOpen, 
  Send,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type SupportCategory = 'technical' | 'billing' | 'medical' | 'account' | 'other'

interface FAQ {
  id: string
  question: string
  answer: string
  category: string
}

const faqs: FAQ[] = [
  {
    id: '1',
    question: 'How do I reset my password?',
    answer: 'You can reset your password by going to Settings > Password. Enter your current password and your new password twice to confirm.',
    category: 'account'
  },
  {
    id: '2',
    question: 'How do I update my health metrics?',
    answer: 'Health metrics are automatically updated from connected devices. You can also manually add metrics by going to Vitals & Metrics page and clicking "Add Metric".',
    category: 'technical'
  },
  {
    id: '3',
    question: 'How do I schedule an appointment?',
    answer: 'Navigate to the Appointments page and click "New Appointment". Fill in the details including date, time, doctor, and appointment type.',
    category: 'medical'
  },
  {
    id: '4',
    question: 'How do I contact my doctor?',
    answer: 'You can message your doctor directly through the Messages page. Select your doctor from the conversation list or start a new conversation.',
    category: 'medical'
  },
  {
    id: '5',
    question: 'What should I do if I receive a critical health alert?',
    answer: 'If you receive a critical health alert, please review the alert details immediately. If symptoms are severe, contact emergency services (911) or your healthcare provider right away.',
    category: 'medical'
  },
  {
    id: '6',
    question: 'How do I update my profile picture?',
    answer: 'Go to Settings > Profile and click on your profile picture. You can upload a new image from your device.',
    category: 'account'
  },
  {
    id: '7',
    question: 'Can I export my health data?',
    answer: 'Yes, you can export your health data by going to Settings > Privacy and clicking "Export Data". Your data will be sent to your registered email address.',
    category: 'account'
  },
  {
    id: '8',
    question: 'How do I change my notification preferences?',
    answer: 'Navigate to Settings > Notifications to customize which notifications you receive via email, push, or SMS.',
    category: 'account'
  },
  {
    id: '9',
    question: 'What devices are compatible with the health monitoring system?',
    answer: 'Our system is compatible with most major health tracking devices including Fitbit, Apple Watch, Garmin, and other devices that support standard health data formats.',
    category: 'technical'
  },
  {
    id: '10',
    question: 'How do I cancel my subscription?',
    answer: 'To cancel your subscription, please contact our billing department at billing@medicarepro.com or call our support line. We\'re here to help with any questions.',
    category: 'billing'
  }
]

export default function SupportPage() {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)
  const [ticketForm, setTicketForm] = useState({
    category: '' as SupportCategory | '',
    subject: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  })
  const [submitting, setSubmitting] = useState(false)

  const filteredFAQs = activeCategory === 'all' 
    ? faqs 
    : faqs.filter(faq => faq.category === activeCategory)

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!ticketForm.category || !ticketForm.subject || !ticketForm.description) {
      toast.error('Error', { description: 'Please fill in all required fields.' })
      return
    }

    setSubmitting(true)
    
    // Simulate API call
    setTimeout(() => {
      toast.success('Support Ticket Submitted', { 
        description: 'Your support ticket has been submitted. We will get back to you within 24 hours.' 
      })
      setTicketForm({
        category: '' as SupportCategory | '',
        subject: '',
        description: '',
        priority: 'medium'
      })
      setSubmitting(false)
    }, 1000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support Center</h1>
        <p className="text-muted-foreground">
          Get help, find answers, and contact our support team
        </p>
      </div>

      {/* Contact Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Support</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Send us an email and we'll respond within 24 hours
            </p>
            <Button variant="outline" className="w-full" asChild>
              <a href="mailto:support@medicarepro.com">
                <Mail className="mr-2 h-4 w-4" />
                support@medicarepro.com
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Phone Support</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Call us Monday-Friday, 9 AM - 5 PM EST
            </p>
            <Button variant="outline" className="w-full" asChild>
              <a href="tel:+1-800-555-0123">
                <Phone className="mr-2 h-4 w-4" />
                1-800-555-0123
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Chat</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Chat with our support team in real-time
            </p>
            <Button variant="outline" className="w-full">
              <MessageSquare className="mr-2 h-4 w-4" />
              Start Chat
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* FAQ Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription>
                Find quick answers to common questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory('all')}
                >
                  All
                </Button>
                <Button
                  variant={activeCategory === 'account' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory('account')}
                >
                  Account
                </Button>
                <Button
                  variant={activeCategory === 'technical' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory('technical')}
                >
                  Technical
                </Button>
                <Button
                  variant={activeCategory === 'medical' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory('medical')}
                >
                  Medical
                </Button>
                <Button
                  variant={activeCategory === 'billing' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory('billing')}
                >
                  Billing
                </Button>
              </div>

              {/* FAQ List */}
              <div className="space-y-2">
                {filteredFAQs.map((faq) => (
                  <Card key={faq.id} className="border">
                    <CardContent className="p-4">
                      <button
                        className="w-full flex items-center justify-between text-left"
                        onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                      >
                        <span className="font-medium text-sm">{faq.question}</span>
                        {expandedFAQ === faq.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                        )}
                      </button>
                      {expandedFAQ === faq.id && (
                        <p className="mt-3 text-sm text-muted-foreground">{faq.answer}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Support Ticket Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Submit a Ticket
              </CardTitle>
              <CardDescription>
                Can't find what you're looking for? Submit a support ticket
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitTicket} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={ticketForm.category}
                    onValueChange={(value) => setTicketForm({ ...ticketForm, category: value as SupportCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical Issue</SelectItem>
                      <SelectItem value="billing">Billing Question</SelectItem>
                      <SelectItem value="medical">Medical Question</SelectItem>
                      <SelectItem value="account">Account Issue</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={ticketForm.priority}
                    onValueChange={(value) => setTicketForm({ ...ticketForm, priority: value as 'low' | 'medium' | 'high' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    placeholder="Brief description of your issue"
                    value={ticketForm.subject}
                    onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Please provide detailed information about your issue..."
                    rows={6}
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Ticket
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Help Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Help Resources
          </CardTitle>
          <CardDescription>
            Additional resources to help you get the most out of MediCare Pro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto flex-col items-start p-4" asChild>
              <a href="#" className="text-left">
                <FileText className="h-5 w-5 mb-2 text-primary" />
                <span className="font-medium">User Guide</span>
                <span className="text-xs text-muted-foreground mt-1">
                  Complete guide to using MediCare Pro
                </span>
              </a>
            </Button>
            <Button variant="outline" className="h-auto flex-col items-start p-4" asChild>
              <a href="#" className="text-left">
                <BookOpen className="h-5 w-5 mb-2 text-primary" />
                <span className="font-medium">Video Tutorials</span>
                <span className="text-xs text-muted-foreground mt-1">
                  Step-by-step video guides
                </span>
              </a>
            </Button>
            <Button variant="outline" className="h-auto flex-col items-start p-4" asChild>
              <a href="#" className="text-left">
                <AlertCircle className="h-5 w-5 mb-2 text-primary" />
                <span className="font-medium">System Status</span>
                <span className="text-xs text-muted-foreground mt-1">
                  Check current system status
                </span>
              </a>
            </Button>
            <Button variant="outline" className="h-auto flex-col items-start p-4" asChild>
              <a href="#" className="text-left">
                <Clock className="h-5 w-5 mb-2 text-primary" />
                <span className="font-medium">Response Times</span>
                <span className="text-xs text-muted-foreground mt-1">
                  Average response: 24 hours
                </span>
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

