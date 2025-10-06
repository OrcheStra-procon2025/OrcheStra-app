import {Box} from '@chakra-ui/react';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactElement;
}

const Layout = ({children}: LayoutProps)=>{
  return( 
    <Box       
      minHeight="100vh" 
      width="100vw" 
      display="flex" 
      flexDirection="column"
      bg="#fefff3"
    >
      <Header />
        <Box as="main" flex="1" width="full">
          {children}
        </Box>
      <Footer />
    </Box>
  )};

export default Layout;