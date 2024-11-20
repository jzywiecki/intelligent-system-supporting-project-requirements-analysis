import { useState, useEffect } from 'react';
import axiosInstance from '@/services/api'; 

interface ImageProps {
  imageURL?: string;
  alt?: string;
  classname?: string;
  onClick?: () => void;
}

function Image({ imageURL = '', alt = '', classname = '', onClick = () => {} }: ImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        if (!imageURL) {
          setImageSrc("/public/nophoto.jpg");
          return;
        }

        if (imageURL.startsWith('/public/') || imageURL.startsWith('data:')) {
          setImageSrc(imageURL);
          return;
        }

        const response = await axiosInstance.get(imageURL, {
          responseType: 'blob',
        });

        const imageUrl = URL.createObjectURL(response.data);
        setImageSrc(imageUrl);
      } catch (error) {
        console.error('Error in image: ', error);
      }
    };

    fetchImage();
    
  }, [imageURL]);

  return (
    <img
      src={imageSrc || '/public/nophoto.jpg'}
      alt={alt}
      className={classname}
      onClick={onClick}
    />
  );
}

export default Image;