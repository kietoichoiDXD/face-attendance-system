import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { registerStudent } from '../api/client';
import { UserPlus, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RegisterStudent() {
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    classId: ''
  });
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Strip the data:image prefix to send clean base64
        const base64 = result.replace(/^data:image\/[a-z]+;base64,/, "");
        setBase64Image(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId || !formData.name || !formData.classId || !base64Image) {
      setMessage({ type: 'error', text: 'Please fill in all fields and select an image' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await registerStudent(formData.studentId, {
        name: formData.name,
        class_id: formData.classId,
        image: base64Image
      });
      setMessage({ type: 'success', text: `Student ${formData.name} registered successfully!` });
      setFormData({ studentId: '', name: '', classId: '' });
      setBase64Image(null);
      // reset file input visually below if needed
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto mt-8">
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <UserPlus className="w-5 h-5" />
              </div>
              <CardTitle className="text-2xl">Register Student</CardTitle>
            </div>
            <CardDescription>Add a new student face to the Rekognition Collection</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-5">
            {message && (
              <div className={`p-4 rounded-md text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message.text}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="studentId">Student ID</Label>
              <Input 
                id="studentId" 
                placeholder="e.g. S10023" 
                value={formData.studentId}
                onChange={e => setFormData({...formData, studentId: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                placeholder="e.g. Alice Smith" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="classId">Class/Group ID</Label>
              <Input 
                id="classId" 
                placeholder="e.g. CS101" 
                value={formData.classId}
                onChange={e => setFormData({...formData, classId: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Face Image</Label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex flex-col items-center justify-center p-4">
                    <ImageIcon className="w-8 h-8 mb-2 text-slate-400" />
                    <p className="text-sm text-slate-500">
                      {base64Image ? "Image selected" : "Click to upload student photo"}
                    </p>
                  </div>
                  <input id="image" type="file" className="hidden" accept="image/jpeg, image/png" onChange={handleImageChange} />
                </label>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 font-medium h-11" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Register Student'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}
