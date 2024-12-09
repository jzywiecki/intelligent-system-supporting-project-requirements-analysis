
const GeneratedElementHeader = ({ title, description }) => {
    return (
        <header className="text-center py-4 bg-gray-200">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-gray-600">{description}</p>
        </header>
    );
};

export default GeneratedElementHeader;
