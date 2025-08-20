import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Eye, 
  User, 
  Calendar,
  MessageSquare,
  Volume2,
  AlertTriangle
} from "lucide-react";

interface AdminPanelProps {
  userId: string;
}

interface PendingVoice {
  id: string;
  name: string;
  description: string;
  category: string;
  authorName: string;
  createdAt: string;
  moderationStatus: string;
  sampleText: string;
}

interface PendingPersonality {
  id: string;
  name: string;
  description: string;
  category: string;
  authorName: string;
  createdAt: string;
  moderationStatus: string;
  prompt: string;
}

export default function AdminPanel({ userId }: AdminPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("voices");

  // Only show admin panel for maxpug17@gmail.com
  if (user?.email !== "maxpug17@gmail.com") {
    return null;
  }

  // Fetch pending voices
  const { data: pendingVoices, isLoading: voicesLoading } = useQuery({
    queryKey: ['admin-pending-voices'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/pending-voices');
      if (!response.ok) throw new Error('Failed to fetch pending voices');
      return response.json();
    },
    enabled: user?.email === "maxpug17@gmail.com"
  });

  // Fetch pending personalities
  const { data: pendingPersonalities, isLoading: personalitiesLoading } = useQuery({
    queryKey: ['admin-pending-personalities'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/pending-personalities');
      if (!response.ok) throw new Error('Failed to fetch pending personalities');
      return response.json();
    },
    enabled: user?.email === "maxpug17@gmail.com"
  });

  // Approve voice mutation
  const approveVoiceMutation = useMutation({
    mutationFn: async (voiceId: string) => {
      const response = await apiRequest('POST', `/api/admin/approve-voice/${voiceId}`);
      if (!response.ok) throw new Error('Failed to approve voice');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Voice Approved",
        description: "The voice has been approved and is now available in the marketplace.",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-voices'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-voices'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve voice",
        variant: "destructive",
      });
    }
  });

  // Reject voice mutation
  const rejectVoiceMutation = useMutation({
    mutationFn: async ({ voiceId, reason }: { voiceId: string; reason: string }) => {
      const response = await apiRequest('POST', `/api/admin/reject-voice/${voiceId}`, { reason });
      if (!response.ok) throw new Error('Failed to reject voice');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Voice Rejected",
        description: "The voice has been rejected and removed from the marketplace.",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-voices'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-voices'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject voice",
        variant: "destructive",
      });
    }
  });

  // Approve personality mutation
  const approvePersonalityMutation = useMutation({
    mutationFn: async (personalityId: string) => {
      const response = await apiRequest('POST', `/api/admin/approve-personality/${personalityId}`);
      if (!response.ok) throw new Error('Failed to approve personality');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Personality Approved",
        description: "The personality has been approved and is now available in the marketplace.",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-personalities'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-personalities'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve personality",
        variant: "destructive",
      });
    }
  });

  // Reject personality mutation
  const rejectPersonalityMutation = useMutation({
    mutationFn: async ({ personalityId, reason }: { personalityId: string; reason: string }) => {
      const response = await apiRequest('POST', `/api/admin/reject-personality/${personalityId}`, { reason });
      if (!response.ok) throw new Error('Failed to reject personality');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Personality Rejected",
        description: "The personality has been rejected and removed from the marketplace.",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-personalities'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-personalities'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject personality",
        variant: "destructive",
      });
    }
  });

  const handleReject = (type: 'voice' | 'personality', id: string) => {
    const reason = prompt(`Reason for rejecting this ${type}:`);
    if (reason) {
      if (type === 'voice') {
        rejectVoiceMutation.mutate({ voiceId: id, reason });
      } else {
        rejectPersonalityMutation.mutate({ personalityId: id, reason });
      }
    }
  };

  return (
    <Card className="bg-dark-lighter/50 backdrop-blur-lg border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-yellow-400" />
          Admin Panel
          <Badge variant="secondary" className="ml-2">Moderation</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="voices" className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Voices ({pendingVoices?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="personalities" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Personalities ({pendingPersonalities?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="voices" className="space-y-4 mt-4">
            {voicesLoading ? (
              <div className="text-center py-8 text-gray-400">Loading pending voices...</div>
            ) : pendingVoices?.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                No pending voices to moderate
              </div>
            ) : (
              <div className="space-y-4">
                {pendingVoices?.map((voice: PendingVoice) => (
                  <div key={voice.id} className="border border-gray-700 rounded-lg p-4 bg-gray-900/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{voice.name}</h3>
                        <p className="text-sm text-gray-400 mt-1">{voice.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {voice.authorName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(voice.createdAt).toLocaleDateString()}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {voice.category}
                          </Badge>
                        </div>
                        <div className="mt-2 p-2 bg-gray-800 rounded text-xs text-gray-300">
                          <strong>Sample:</strong> {voice.sampleText}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => approveVoiceMutation.mutate(voice.id)}
                          disabled={approveVoiceMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject('voice', voice.id)}
                          disabled={rejectVoiceMutation.isPending}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="personalities" className="space-y-4 mt-4">
            {personalitiesLoading ? (
              <div className="text-center py-8 text-gray-400">Loading pending personalities...</div>
            ) : pendingPersonalities?.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                No pending personalities to moderate
              </div>
            ) : (
              <div className="space-y-4">
                {pendingPersonalities?.map((personality: PendingPersonality) => (
                  <div key={personality.id} className="border border-gray-700 rounded-lg p-4 bg-gray-900/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{personality.name}</h3>
                        <p className="text-sm text-gray-400 mt-1">{personality.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {personality.authorName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(personality.createdAt).toLocaleDateString()}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {personality.category}
                          </Badge>
                        </div>
                        <div className="mt-2 p-2 bg-gray-800 rounded text-xs text-gray-300">
                          <strong>Prompt:</strong> {personality.prompt.substring(0, 200)}...
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => approvePersonalityMutation.mutate(personality.id)}
                          disabled={approvePersonalityMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject('personality', personality.id)}
                          disabled={rejectPersonalityMutation.isPending}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
