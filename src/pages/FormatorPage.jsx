// src/pages/FormatorPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header.jsx";
import Footer from "@/components/Footer.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { BookOpen, FileText, MessageSquare } from "lucide-react";
import { supabase, getFileUrl } from "@/lib/supabaseClient.js";

// Import Mobile Bottom Navigation


import FormatorProfile from "@/components/formateur/FormatorProfile.jsx";
import FormatorPrograms from "@/components/formateur/FormatorPrograms.jsx";
import FormatorDocuments from "@/components/formateur/FormatorDocuments.jsx";
import FormatorPublications from "@/components/formateur/FormatorPublications.jsx";

const FormatorPage = () => {
  const { formateurId } = useParams();
  const navigate = useNavigate();
  const [formateur, setFormateur] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFormateur = async () => {
      try {
        setLoading(true);

        // Récupérer le formateur depuis la table users
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", formateurId)
          .eq("role", "formateur")
          .single();

        if (userError) throw userError;

        // Transformer en structure compatible avec FormatorProfile
        const formateurData = {
          id: userData.id,
          user_id: userData.id,
          expand: {
            user_id: userData,
          },
          specialty: userData.specialty || "Formateur Expert",
          courses_count: 0,
          sessions_count: 0,
          rating: null,
        };

        setFormateur(formateurData);
      } catch (error) {
        console.error("Error fetching formateur:", error);
        navigate("/"); // Redirect if not found
      } finally {
        setLoading(false);
      }
    };

    if (formateurId) fetchFormateur();
  }, [formateurId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Skeleton className="h-64 w-full rounded-3xl mb-8" />
          <Skeleton className="h-12 w-full max-w-md mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!formateur) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Formateur non trouvé.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/10 pb-16 md:pb-0">
      <Helmet>
        <title>
          {formateur?.expand?.user_id?.full_name || "Formateur"} - sigef.app
        </title>
      </Helmet>

      <Header />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <FormatorProfile formateur={formateur} />

          <Tabs defaultValue="programs" className="w-full">
            <TabsList className="w-full justify-start h-auto p-1 bg-card border shadow-sm rounded-xl overflow-x-auto flex-nowrap">
              <TabsTrigger
                value="programs"
                className="py-3 px-6 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary whitespace-nowrap"
              >
                <BookOpen className="w-4 h-4 mr-2" /> Programmes
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                className="py-3 px-6 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary whitespace-nowrap"
              >
                <FileText className="w-4 h-4 mr-2" /> Ressources
              </TabsTrigger>
              <TabsTrigger
                value="publications"
                className="py-3 px-6 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary whitespace-nowrap"
              >
                <MessageSquare className="w-4 h-4 mr-2" /> Publications
              </TabsTrigger>
            </TabsList>

            <div className="mt-8">
              <TabsContent
                value="programs"
                className="m-0 focus-visible:outline-none"
              >
                <FormatorPrograms formateurId={formateurId} />
              </TabsContent>
              <TabsContent
                value="documents"
                className="m-0 focus-visible:outline-none"
              >
                <FormatorDocuments formateurId={formateurId} />
              </TabsContent>
              <TabsContent
                value="publications"
                className="m-0 focus-visible:outline-none"
              >
                <FormatorPublications formateurId={formateurId} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>

      <Footer />
      
      {/* Mobile Bottom Navigation */}
     
    </div>
  );
};

export default FormatorPage;