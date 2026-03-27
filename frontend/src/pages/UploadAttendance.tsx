import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { processAttendance } from '../api/client';
import { FileImage, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function UploadAttendance() {
  const [classId, setClassId] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const imageRef = useRef<HTMLImageElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setResult(null); // clear previous bounding boxes
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId || !imagePreviewUrl) {
      setError('Please provide Class ID and select an image.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Extract base64
      const base64 = imagePreviewUrl.replace(/^data:image\/[a-z]+;base64,/, "");
      
      const response = await processAttendance(classId, { image: base64 });
      setResult(response);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6 mt-4">
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <FileImage className="w-5 h-5" />
              </div>
              <CardTitle className="text-2xl">Upload Class Photo</CardTitle>
            </div>
            <CardDescription>Submit a group photo to automatically mark attendance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && (
              <div className="p-4 rounded-md text-sm font-medium bg-red-50 text-red-700 border border-red-200">
                {error}
              </div>
            )}
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="classId">Class/Group ID</Label>
                  <Input 
                    id="classId" 
                    placeholder="e.g. CS101" 
                    value={classId}
                    onChange={e => setClassId(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="groupImage">Group Image</Label>
                  <Input 
                    id="groupImage" 
                    type="file" 
                    accept="image/jpeg, image/png"
                    onChange={handleImageChange}
                  />
                </div>
                
                {result && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-4 border-t border-slate-100">
                    <h4 className="font-semibold flex items-center gap-2 text-emerald-600 mb-4">
                      <CheckCircle2 className="w-5 h-5" />
                      Attendance Processed
                    </h4>
                    <div className="space-y-2 text-sm text-slate-700">
                      <div className="flex justify-between bg-slate-50 p-2 rounded">
                        <span>Faces Matched:</span>
                        <span className="font-bold">{result.present_students?.length || 0}</span>
                      </div>
                      <div className="flex justify-between bg-slate-50 p-2 rounded">
                        <span>Unrecognized Faces:</span>
                        <span className="font-bold">{result.unmatched_faces_count || 0}</span>
                      </div>
                      
                      {result.present_students?.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <p className="font-medium mb-2">Present Students:</p>
                          <ul className="list-disc pl-5 space-y-1">
                            {result.present_students.map((st: string) => (
                              <li key={st}>{st}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
              
              <div className="border border-slate-200 rounded-lg bg-slate-50 p-2 flex items-center justify-center relative min-h-[300px] overflow-hidden">
                {!imagePreviewUrl ? (
                  <p className="text-slate-400 text-sm">Image preview will appear here</p>
                ) : (
                  <div className="relative inline-block max-w-full">
                    <img 
                      ref={imageRef}
                      src={imagePreviewUrl} 
                      alt="Class Preview" 
                      className="max-w-full h-auto object-contain rounded"
                    />
                    
                    {/* Render Bounding Boxes */}
                    {result?.bounding_boxes && imageRef.current && (
                      <svg 
                        className="absolute top-0 left-0 w-full h-full pointer-events-none" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        {result.bounding_boxes.map((box: any, i: number) => {
                          const width = box.Width * 100;
                          const height = box.Height * 100;
                          const left = box.Left * 100;
                          const top = box.Top * 100;
                          
                          const isMatched = box.matched;
                          const strokeColor = isMatched ? '#10b981' : '#f43f5e'; // emerald or rose
                          
                          return (
                            <g key={i}>
                              <rect 
                                x={`${left}%`} 
                                y={`${top}%`} 
                                width={`${width}%`} 
                                height={`${height}%`} 
                                fill="none" 
                                stroke={strokeColor} 
                                strokeWidth="3" 
                                rx="4"
                              />
                            </g>
                          );
                        })}
                      </svg>
                    )}
                  </div>
                )}
              </div>
            </div>
            
          </CardContent>
          <CardFooter>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 font-medium h-11 w-full md:w-auto" disabled={loading || !imagePreviewUrl}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Face Data...
                </>
              ) : (
                'Process Attendance'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}
