import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axiosInstance from "@/services/api";
import { API_URLS } from "@/services/apiUrls";
import { useSnackbar } from "notistack";
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import axios from 'axios';
import { makePictureUrl } from "@/utils/url";

interface LogoListProps { }

const LogoList: React.FC<LogoListProps> = () => {
    const { projectID } = useParams();
    const { enqueueSnackbar } = useSnackbar();
    const [logoUrls, setLogoUrls] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeImage, setActiveImage] = useState<string | null>(null);

    const isImageUrl = async (url) => {
        try {
            const response = await axios.head(url, { timeout: 5000 });
            if (!(response.status == 200)) {
                throw new Error(`URL does not point to an image: ${url}`);
            }
            return true;
        } catch (error) {
            console.error(`Failed to verify image URL: ${url}`, error);
            throw new Error(`Image validation failed for URL: ${url}`);
        }
    };

    const fetchData = async () => {
        try {
            const response = await axiosInstance.get(`${API_URLS.API_SERVER_URL}/model/logo/${projectID}`);
            console.log(response.data)

            const image_list = response.data.urls;

            await Promise.all(
                image_list.map(async (url) => {
                    await isImageUrl(url);
                })
            );
            const logoUrls = image_list.map(makePictureUrl);
            setLogoUrls(logoUrls);

        } catch (error) {
            if (error.response) {
                console.error("API Error:", error);
                enqueueSnackbar(`Error fetching logo data from API: ${error.response.status}`, { variant: "error" });
            } else if (error.message && error.message.startsWith("Image validation failed")) {
                console.error("Image URL Error:", error);
                enqueueSnackbar(`Error: invalid images.`, { variant: "error" });
            } else {
                console.error("Unexpected Error:", error);
                enqueueSnackbar(`Unexpected error occurred: ${error.message}`, { variant: "error" });
            }
        }
    };


    useEffect(() => {
        fetchData();
    }, [projectID]);

    const openModal = (image: string) => {
        setActiveImage(image);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setActiveImage(null);
    };

    const [api, setApi] = React.useState<CarouselApi>()
    // const [current, setCurrent] = React.useState(0)
    // const [count, setCount] = React.useState(0)

    React.useEffect(() => {
        if (!api) {
            return
        }
        // setCount(api.scrollSnapList().length)
        // setCurrent(api.selectedScrollSnap() + 1)

        // api.on("select", () => {
        //     setCurrent(api.selectedScrollSnap() + 1)
        // })
        api.on("select", () => {
            // Do something on select.
        })
    }, [api])

    return (
        <div className="h-screen w-full flex justify-center items-center ">
            <div
                style={{ display: 'flex', justifyContent: "center", alignItems: "center", width: '80%', height: '100vh' }}
            >
                {logoUrls.length > 0 ? (
                    <Carousel opts={{
                        // align: "start",
                        loop: true,
                    }}
                        // plugins={[
                        //     Autoplay({
                        //         delay: 2000,
                        //     }),
                        // ]}
                        // className='mt-[2rem]'
                        setApi={setApi}
                    >
                        <CarouselContent >
                            {logoUrls.map((url, index) => (
                                <CarouselItem
                                    key={index}
                                    className="basis-1/3 flex-grow-0 flex-shrink-0 flex justify-center items-center cursor-pointer transition-transform hover:scale-105"
                                    onClick={() => openModal(url)}
                                    style={{ width: '33%', aspectRatio: "1/1" }}
                                >
                                    <img
                                        src={url}
                                        alt={`Logo ${index + 1}`}
                                        className="w-full h-auto rounded-md shadow-md"
                                    />
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious />
                        <CarouselNext />
                    </Carousel>
                ) : (
                    <p>Loading logos...</p>
                )}

                {isModalOpen && activeImage && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
                        onClick={closeModal}
                    >
                        <img
                            src={activeImage}
                            alt="Full-size logo"
                            className="max-w-full max-h-full rounded-lg shadow-lg"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default LogoList;
