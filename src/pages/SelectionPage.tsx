import logo from "@/assets/logo.png";
import { useState, useRef, type RefObject } from "react";
import { Flex, Text, Box, Heading } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import SelectableMusicList from "@/components/SelectableMusicList";

async function Upload(changeEvent: React.ChangeEvent<HTMLInputElement|null>, linkRef: RefObject<HTMLAnchorElement|null>, setState: CallableFunction) {
  const files = changeEvent.currentTarget.files
  if (!files || files?.length === 0) return;
  const uploadedFileBin = await files[0].bytes();
  setState({uploadedFile: uploadedFileBin, uploadedFileType: files[0].type, selectedMusic: 0});
  linkRef?.current?.click();
};

export default function SelectionPage() {
  const uploadLinkRef: RefObject<HTMLAnchorElement|null> = useRef(null);
  const uploadInputRef: RefObject<HTMLInputElement|null> = useRef(null);
  const [linkState, setLinkState] = useState({})
  return (
    <>
      <Flex width="100%" alignItems="center" gap="30px" marginBottom="20px">
        <Box maxW="200px;">
          <img src={logo} alt="Logo" />
        </Box>
        <Heading as="h2" fontWeight="medium" size="xl">
          曲の選択
        </Heading>
      </Flex>
      <Box textAlign="start">
        <Heading as="h3" fontWeight="normal" size="lg" marginBottom="10px;">
          一覧から選ぶ
        </Heading>
        <SelectableMusicList />
      </Box>
      <Text textAlign="center" fontSize="xl">
        もしくは
      </Text>
      <Box textAlign="start" marginTop="20px">
        <Heading as="h3" fontWeight="normal" size="lg" marginBottom="10px;">
          ファイルをアップロードする
        </Heading>
      </Box>
      <Box bgColor="gray.200" p="20">
        <Text fontSize="2xl">ここにファイルをドラッグ＆ドロップ</Text>
        <Link to="#" color="blue.500" onClick={() => {if (uploadInputRef.current) {uploadInputRef.current.click();};}}>
          または - ファイルを選択する
        </Link>
      </Box>
      <Link to="/play" state={linkState} ref={uploadLinkRef} hidden>start</Link>
      <input type="file" id="upload_input" ref={uploadInputRef} accept="audio/mpeg, audio/ogg, audio/opus, audio/wav" onChange={(event: React.ChangeEvent<HTMLInputElement>) => Upload(event, uploadLinkRef, setLinkState)} hidden></input>
    </>
  );
};
